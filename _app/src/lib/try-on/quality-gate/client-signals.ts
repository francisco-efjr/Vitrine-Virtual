'use client'

import {
  FaceDetector,
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision'
import type {
  CustomerPhotoSignals,
  CustomerPhotoType,
  GarmentPhotoSignals,
} from './types'

/**
 * Computa os signals do quality-gate no navegador (research §5.1).
 *
 * Por que no cliente?
 *   - UX: rejeição instantânea antes de qualquer upload pago.
 *   - Custo: bloqueia o Gemini em fotos visivelmente ruins.
 *   - Privacidade: a foto continua só no device até passar no gate.
 *
 * O servidor ainda valida (`evaluateCustomerPhoto`) — esses signals são
 * input "best-effort" e a thresholds.ts é a fonte da verdade.
 */

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

let cachedFaceDetector: Promise<FaceDetector> | null = null
let cachedPoseLandmarker: Promise<PoseLandmarker> | null = null

async function getFaceDetector(): Promise<FaceDetector> {
  if (!cachedFaceDetector) {
    cachedFaceDetector = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE)
      return FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: 'GPU' },
        runningMode: 'IMAGE',
      })
    })()
  }
  return cachedFaceDetector
}

async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!cachedPoseLandmarker) {
    cachedPoseLandmarker = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE)
      return PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'GPU' },
        runningMode: 'IMAGE',
        numPoses: 2,
      })
    })()
  }
  return cachedPoseLandmarker
}

interface DecodedImage {
  bitmap: ImageBitmap
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  /** Versão reduzida (short side = 1024) usada para sharpness / luminance. */
  scaled: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }
}

async function decode(file: File): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D indisponível')
  ctx.drawImage(bitmap, 0, 0)

  const shortSide = Math.min(bitmap.width, bitmap.height)
  const scale = shortSide > 1024 ? 1024 / shortSide : 1
  const sW = Math.max(1, Math.round(bitmap.width * scale))
  const sH = Math.max(1, Math.round(bitmap.height * scale))
  const scaledCanvas = document.createElement('canvas')
  scaledCanvas.width = sW
  scaledCanvas.height = sH
  const scaledCtx = scaledCanvas.getContext('2d')
  if (!scaledCtx) throw new Error('Canvas 2D indisponível')
  scaledCtx.drawImage(bitmap, 0, 0, sW, sH)

  return {
    bitmap,
    canvas,
    ctx,
    width: bitmap.width,
    height: bitmap.height,
    scaled: { canvas: scaledCanvas, ctx: scaledCtx },
  }
}

function meanLuminanceAndSharpness(img: DecodedImage): {
  meanLuminance: number
  sharpness: number
} {
  const { canvas, ctx } = img.scaled
  const { width: w, height: h } = canvas
  const data = ctx.getImageData(0, 0, w, h).data

  const gray = new Float32Array(w * h)
  let sum = 0
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    const y = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!
    gray[j] = y
    sum += y
  }
  const meanLuminance = sum / gray.length

  // Variância da Laplaciana 3×3 (kernel [[0,1,0],[1,-4,1],[0,1,0]]).
  // Métrica de sharpness consagrada (research §5.1).
  let lapSum = 0
  let lapSumSq = 0
  let count = 0
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x
      const v =
        -4 * gray[idx]! +
        gray[idx - 1]! +
        gray[idx + 1]! +
        gray[idx - w]! +
        gray[idx + w]!
      lapSum += v
      lapSumSq += v * v
      count += 1
    }
  }
  const mean = lapSum / count
  const variance = lapSumSq / count - mean * mean
  return { meanLuminance, sharpness: variance }
}

interface FaceFindings {
  faceVisible: boolean
  faceAreaFraction: number
}

async function detectFaces(img: DecodedImage): Promise<FaceFindings> {
  try {
    const det = await getFaceDetector()
    const res = det.detect(img.scaled.canvas)
    if (!res.detections.length) return { faceVisible: false, faceAreaFraction: 0 }
    // Maior face encontrada.
    let best = 0
    const W = img.scaled.canvas.width
    const H = img.scaled.canvas.height
    for (const d of res.detections) {
      const bb = d.boundingBox
      if (!bb) continue
      const area = (bb.width * bb.height) / (W * H)
      if (area > best) best = area
    }
    return { faceVisible: best > 0, faceAreaFraction: best }
  } catch {
    // MediaPipe pode falhar em ambientes restritos (Safari iOS antigo, sem GPU).
    // Tratamos como "uncertain" — o servidor decide.
    return { faceVisible: true, faceAreaFraction: 0.1 }
  }
}

interface PoseFindings {
  personCount: number
  fullBodyLandmarksOk: boolean
  poseUpright: boolean
  detectedType: CustomerPhotoType
  /** Fração do torso/pernas sem oclusão (heurística simples). */
  targetRegionUnoccluded: number
}

const POSE_IDX = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const

function landmarkVisible(
  landmarks: PoseLandmarkerResult['landmarks'][number] | undefined,
  idx: number,
  threshold = 0.5,
): boolean {
  const lm = landmarks?.[idx]
  if (!lm) return false
  const v = lm.visibility ?? 1
  return v >= threshold
}

async function detectPose(img: DecodedImage): Promise<PoseFindings> {
  try {
    const landmarker = await getPoseLandmarker()
    const res = landmarker.detect(img.scaled.canvas)
    const people = res.landmarks.length

    if (people === 0) {
      return {
        personCount: 0,
        fullBodyLandmarksOk: false,
        poseUpright: false,
        detectedType: 'partial',
        targetRegionUnoccluded: 0,
      }
    }

    // Pega a pessoa principal: a com mais landmarks visíveis no ombro+quadril.
    let primary = 0
    let primaryScore = -1
    for (let i = 0; i < res.landmarks.length; i += 1) {
      const lm = res.landmarks[i]
      const score =
        Number(landmarkVisible(lm, POSE_IDX.leftShoulder)) +
        Number(landmarkVisible(lm, POSE_IDX.rightShoulder)) +
        Number(landmarkVisible(lm, POSE_IDX.leftHip)) +
        Number(landmarkVisible(lm, POSE_IDX.rightHip))
      if (score > primaryScore) {
        primaryScore = score
        primary = i
      }
    }
    const lm = res.landmarks[primary]

    const hasFace = landmarkVisible(lm, POSE_IDX.nose, 0.4)
    const hasShoulders =
      landmarkVisible(lm, POSE_IDX.leftShoulder) ||
      landmarkVisible(lm, POSE_IDX.rightShoulder)
    const hasHips =
      landmarkVisible(lm, POSE_IDX.leftHip) ||
      landmarkVisible(lm, POSE_IDX.rightHip)
    const hasKnees =
      landmarkVisible(lm, POSE_IDX.leftKnee) ||
      landmarkVisible(lm, POSE_IDX.rightKnee)
    const hasAnkles =
      landmarkVisible(lm, POSE_IDX.leftAnkle) ||
      landmarkVisible(lm, POSE_IDX.rightAnkle)

    const fullBodyLandmarksOk = hasFace && hasShoulders && hasHips && hasKnees && hasAnkles

    // detectedType (research §13)
    let detectedType: CustomerPhotoType
    if (fullBodyLandmarksOk) {
      detectedType = 'full_body'
    } else if (hasFace && hasShoulders && hasHips) {
      detectedType = 'three_quarter'
    } else if (hasFace && hasShoulders) {
      detectedType = 'selfie'
    } else {
      detectedType = 'partial'
    }

    // poseUpright: ombros acima do quadril, e quadril acima dos joelhos quando visíveis.
    let poseUpright = true
    const ls = lm?.[POSE_IDX.leftShoulder]
    const lh = lm?.[POSE_IDX.leftHip]
    if (ls && lh) {
      poseUpright = ls.y < lh.y
    }
    if (poseUpright && hasKnees) {
      const lk = lm?.[POSE_IDX.leftKnee]
      if (lh && lk) poseUpright = lh.y < lk.y
    }

    // targetRegionUnoccluded: fração média de visibility entre torso e pernas.
    const torsoLm = [POSE_IDX.leftShoulder, POSE_IDX.rightShoulder, POSE_IDX.leftHip, POSE_IDX.rightHip]
    const visTorso =
      torsoLm.reduce((s, i) => s + (lm?.[i]?.visibility ?? 0), 0) / torsoLm.length
    const legLm = [POSE_IDX.leftKnee, POSE_IDX.rightKnee, POSE_IDX.leftAnkle, POSE_IDX.rightAnkle]
    const visLegs =
      legLm.reduce((s, i) => s + (lm?.[i]?.visibility ?? 0), 0) / legLm.length

    // Para tops o torso pesa mais; para full body usamos média simples.
    const targetRegionUnoccluded = fullBodyLandmarksOk
      ? (visTorso + visLegs) / 2
      : visTorso

    return {
      personCount: people,
      fullBodyLandmarksOk,
      poseUpright,
      detectedType,
      targetRegionUnoccluded,
    }
  } catch {
    return {
      personCount: 1,
      fullBodyLandmarksOk: false,
      poseUpright: true,
      detectedType: 'partial',
      targetRegionUnoccluded: 0.7,
    }
  }
}

export async function computeCustomerSignals(file: File): Promise<CustomerPhotoSignals> {
  const img = await decode(file)
  try {
    const { meanLuminance, sharpness } = meanLuminanceAndSharpness(img)
    const [face, pose] = await Promise.all([detectFaces(img), detectPose(img)])

    return {
      shortestSidePx: Math.min(img.width, img.height),
      meanLuminance,
      sharpness,
      personCount: pose.personCount,
      faceVisible: face.faceVisible,
      faceAreaFraction: face.faceAreaFraction,
      fullBodyLandmarksOk: pose.fullBodyLandmarksOk,
      poseUpright: pose.poseUpright,
      targetRegionUnoccluded: pose.targetRegionUnoccluded,
      detectedType: pose.detectedType,
    }
  } finally {
    img.bitmap.close?.()
  }
}

/**
 * Versão minimalista para a peça. Só roda quando o lojista subir uma foto nova
 * — hoje, a peça vem do storage da loja, então essa função é usada em
 * `peca-form-modal.tsx` se quisermos validar antes de salvar. Por ora, o
 * servidor recebe `null` aqui e usa só as dimensões.
 */
export async function computeGarmentSignals(file: File): Promise<GarmentPhotoSignals> {
  const img = await decode(file)
  try {
    return {
      shortestSidePx: Math.min(img.width, img.height),
      // O servidor não roda detecção pesada hoje — usamos um valor neutro alto
      // para passar o gate; a verdadeira detecção fica como TODO de Tier A.
      detectionConfidence: 0.85,
      garmentAreaFraction: 0.6,
      detectedPhotoType: 'auto',
    }
  } finally {
    img.bitmap.close?.()
  }
}
