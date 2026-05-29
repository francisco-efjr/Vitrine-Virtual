import 'server-only'
import sharp from 'sharp'
import { arcfaceSimilarity } from './arcface'
import { detectFaceBbox } from './face-region'

/**
 * Identity similarity — research deliverable §14.
 *
 * Estratégia (em cascata, escolhe o método mais forte disponível):
 *
 *   1. ArcFace cosine (canônico): face bbox via yolov8n-pose → embedding 512-d
 *      → cosine. Threshold canônico do research: 0.55.
 *
 *   2. dHash em face crop real: quando o ArcFace model não está disponível
 *      mas conseguimos cropar o rosto via pose detection. Mais robusto que
 *      o terço superior heurístico antigo.
 *
 *   3. dHash legacy (terço superior): fallback final quando nem yolov8n-pose
 *      está disponível. Threshold de proxy: 0.78.
 *
 * Por que cascata e não trocar atomicamente:
 *   - Em CI/dev sem modelos, o check continua útil em modo legacy.
 *   - Quando os modelos chegam em prod, automaticamente pula pro melhor método.
 *   - O acceptance loga `method` em todo log, o dashboard separa as faixas.
 */

const FACE_CROP_FALLBACK = { topFraction: 0.0, heightFraction: 0.35, sidePadding: 0.15 }
const DHASH_W = 9
const DHASH_H = 8

async function faceRegionGray(
  buffer: Buffer,
  bbox: [number, number, number, number] | null,
): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  if (W === 0 || H === 0) {
    throw new Error('identity-check: metadata sem dimensões')
  }

  let cropLeft: number
  let cropTop: number
  let cropWidth: number
  let cropHeight: number

  if (bbox) {
    cropLeft = Math.max(0, Math.floor(bbox[0]))
    cropTop = Math.max(0, Math.floor(bbox[1]))
    cropWidth = Math.max(1, Math.min(W - cropLeft, Math.ceil(bbox[2] - bbox[0])))
    cropHeight = Math.max(1, Math.min(H - cropTop, Math.ceil(bbox[3] - bbox[1])))
  } else {
    cropLeft = Math.floor(W * FACE_CROP_FALLBACK.sidePadding)
    cropTop = Math.floor(H * FACE_CROP_FALLBACK.topFraction)
    cropWidth = Math.max(1, W - cropLeft * 2)
    cropHeight = Math.max(1, Math.floor(H * FACE_CROP_FALLBACK.heightFraction))
  }

  return sharp(buffer)
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .resize(DHASH_W, DHASH_H, { fit: 'fill', kernel: 'lanczos3' })
    .greyscale()
    .raw()
    .toBuffer()
}

function dHash(gray: Buffer): bigint {
  let bits = 0n
  let bitIdx = 0n
  for (let y = 0; y < DHASH_H; y += 1) {
    for (let x = 0; x < DHASH_W - 1; x += 1) {
      const a = gray[y * DHASH_W + x] ?? 0
      const b = gray[y * DHASH_W + x + 1] ?? 0
      if (a > b) bits |= 1n << bitIdx
      bitIdx += 1n
    }
  }
  return bits
}

function hammingDistance(a: bigint, b: bigint): number {
  let x = a ^ b
  let count = 0
  while (x !== 0n) {
    if ((x & 1n) === 1n) count += 1
    x >>= 1n
  }
  return count
}

export type IdentityMethod =
  | 'arcface_cosine'
  | 'dhash_face_crop'
  | 'dhash_face_region_proxy'

export interface IdentitySimilarityResult {
  /** Similaridade em [0, 1] (cosine pra arcface, (64-hamming)/64 pra dHash). */
  similarity: number
  /** Quantos bits de 64 mudaram (apenas em métodos dHash). */
  hammingDistance?: number
  /** Dimensão do embedding (apenas arcface). */
  embeddingDim?: number
  /** Método efetivamente usado nesta chamada. */
  method: IdentityMethod
  /** Se faces foram cropadas via pose detection (vs fallback heurístico). */
  faceCroppedByPose: boolean
}

/**
 * Calcula similaridade facial — escolhe o método mais forte disponível.
 */
export async function computeIdentitySimilarity(
  customerImage: Buffer,
  resultImage: Buffer,
): Promise<IdentitySimilarityResult> {
  // Tenta cropar face com pose detection (pode ser null se modelo não está)
  const [customerBbox, resultBbox] = await Promise.all([
    detectFaceBbox(customerImage).catch(() => null),
    detectFaceBbox(resultImage).catch(() => null),
  ])
  const faceCroppedByPose = Boolean(customerBbox && resultBbox)

  // Caminho ArcFace (mais forte)
  if (faceCroppedByPose) {
    const arc = await arcfaceSimilarity(
      customerImage,
      resultImage,
      customerBbox,
      resultBbox,
    )
    if (arc) {
      return {
        similarity: arc.similarity,
        embeddingDim: arc.dim,
        method: 'arcface_cosine',
        faceCroppedByPose: true,
      }
    }
  }

  // Cai pro dHash. Se temos bbox da face, hash do crop verdadeiro;
  // senão, hash do terço superior (legacy).
  const [customerGray, resultGray] = await Promise.all([
    faceRegionGray(customerImage, customerBbox),
    faceRegionGray(resultImage, resultBbox),
  ])
  const hashA = dHash(customerGray)
  const hashB = dHash(resultGray)
  const dist = hammingDistance(hashA, hashB)
  const similarity = (64 - dist) / 64
  return {
    similarity,
    hammingDistance: dist,
    method: faceCroppedByPose ? 'dhash_face_crop' : 'dhash_face_region_proxy',
    faceCroppedByPose,
  }
}
