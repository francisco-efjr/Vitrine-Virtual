import 'server-only'
import sharp from 'sharp'
import { detectPosesOnImage, type PoseDetection } from './pose-detect'

/**
 * Estima a bbox da face a partir de keypoints COCO de uma pose.
 *
 * Heurística:
 *   - Centro da face = nose (kpt 0)
 *   - Largura ≈ 2.0 × distância entre ouvidos (kpts 3 e 4) OU
 *     2.0 × distância entre olhos (kpts 1 e 2) como fallback
 *   - Altura = largura × 1.25 (rosto humano típico)
 *   - Padding de 20% pra capturar a sobrancelha e o queixo
 *
 * Quando keypoints da cabeça não estão visíveis, retorna null e o caller
 * cai pro fallback (upper third do bbox da pessoa).
 */
const KP = {
  nose: 0,
  leftEye: 1,
  rightEye: 2,
  leftEar: 3,
  rightEar: 4,
} as const

const VISIBILITY_MIN = 0.4

export function faceBboxFromPose(
  pose: PoseDetection,
  imageWidth: number,
  imageHeight: number,
): [number, number, number, number] | null {
  const nose = pose.keypoints[KP.nose]
  if (!nose || nose.vis < VISIBILITY_MIN) return null

  let halfWidth = 0
  const leftEar = pose.keypoints[KP.leftEar]
  const rightEar = pose.keypoints[KP.rightEar]
  if (leftEar && rightEar && leftEar.vis >= VISIBILITY_MIN && rightEar.vis >= VISIBILITY_MIN) {
    halfWidth = Math.abs(leftEar.x - rightEar.x) * 0.6
  } else {
    const leftEye = pose.keypoints[KP.leftEye]
    const rightEye = pose.keypoints[KP.rightEye]
    if (leftEye && rightEye && leftEye.vis >= VISIBILITY_MIN && rightEye.vis >= VISIBILITY_MIN) {
      halfWidth = Math.abs(leftEye.x - rightEye.x) * 1.3
    } else {
      return null
    }
  }
  if (halfWidth < 4) return null

  const cx = nose.x
  const cy = nose.y
  const halfHeight = halfWidth * 1.25
  const padW = halfWidth * 0.2
  const padH = halfHeight * 0.2

  const x1 = Math.max(0, cx - halfWidth - padW)
  const y1 = Math.max(0, cy - halfHeight - padH)
  const x2 = Math.min(imageWidth, cx + halfWidth + padW)
  const y2 = Math.min(imageHeight, cy + halfHeight + padH)
  if (x2 - x1 < 8 || y2 - y1 < 8) return null
  return [x1, y1, x2, y2]
}

/**
 * Encontra a bbox da face na imagem rodando yolov8n-pose e aplicando
 * `faceBboxFromPose`. Coords no espaço da IMAGEM ORIGINAL (não 640×640).
 */
export async function detectFaceBbox(
  imageBuffer: Buffer,
): Promise<[number, number, number, number] | null> {
  const meta = await sharp(imageBuffer).metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  if (W === 0 || H === 0) return null

  const poses = await detectPosesOnImage(imageBuffer)
  if (!poses || poses.length === 0) return null

  // Pessoa principal: a com maior confidence
  const primary = poses.sort((a, b) => b.confidence - a.confidence)[0]!
  return faceBboxFromPose(primary, W, H)
}
