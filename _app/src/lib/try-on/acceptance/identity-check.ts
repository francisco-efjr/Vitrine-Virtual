import 'server-only'
import sharp from 'sharp'

/**
 * Identity similarity — research deliverable §14.
 *
 * **Hoje (PROXY)**: difference hash (dHash) na região do rosto (terço superior).
 * Sem deps novas — só `sharp`, que já está no projeto. Captura mudanças
 * grosseiras na cara/cabelo/iluminação. Bom o suficiente pra começar a logar
 * uma baseline de fidelidade real do Gemini em produção.
 *
 * **Amanhã (verdadeiro ArcFace)**: trocar `dHashSimilarity` por um embedding
 * facial (buffalo_s ~50MB via `onnxruntime-node`), cropando a face por
 * detecção (não pelo terço superior). Tag de TODO clara abaixo.
 *
 * Por que dHash e não aHash/pHash:
 *   - aHash é mais sensível a brilho global. Try-on muda o brilho.
 *   - pHash exige DCT — código maior, sharp não traz DCT nativo.
 *   - dHash compara gradientes adjacentes; mais robusto a iluminação.
 *
 * Mapeamento dHash→"cosine-like":
 *   `similarity = (64 - hamming) / 64`  ∈ [0, 1]
 *   Não é cosine real, mas a faixa é a mesma e a semântica é a mesma:
 *   "1 = idêntico, 0 = oposto". O threshold de 0.55 do research foi pensado
 *   pra ArcFace; pra dHash uma calibração inicial razoável é 0.78 (16/64 bits
 *   flipped = mudança "perceptível" mas não "muda a pessoa"). Como os checks
 *   estão em modo LOG, o threshold só serve pra colorir o dashboard.
 */

/** Recorte heurístico da região do rosto: terço superior central. */
const FACE_CROP = { topFraction: 0.0, heightFraction: 0.35, sidePadding: 0.15 }

/** Resolução do hash: 9×8 grayscale (8 bits por linha × 8 linhas = 64 bits). */
const DHASH_W = 9
const DHASH_H = 8

async function faceRegionGray(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  if (W === 0 || H === 0) {
    throw new Error('identity-check: metadata sem dimensões')
  }

  const cropLeft = Math.floor(W * FACE_CROP.sidePadding)
  const cropTop = Math.floor(H * FACE_CROP.topFraction)
  const cropWidth = Math.max(1, W - cropLeft * 2)
  const cropHeight = Math.max(1, Math.floor(H * FACE_CROP.heightFraction))

  return sharp(buffer)
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .resize(DHASH_W, DHASH_H, { fit: 'fill', kernel: 'lanczos3' })
    .greyscale()
    .raw()
    .toBuffer()
}

/** Computa o dHash em hex (16 chars) a partir do recorte normalizado. */
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

export interface IdentitySimilarityResult {
  /** Similaridade em [0, 1] — não é cosine real, é proxy via dHash. */
  similarity: number
  /** Quantos bits de 64 mudaram entre os dois hashes. */
  hammingDistance: number
  /** Marca explicitamente o método pra dashboards. */
  method: 'dhash_face_region_proxy'
}

/**
 * Calcula similaridade "facial" entre a foto original e o resultado.
 *
 * TODO (ArcFace real):
 *   - Trocar este arquivo por um wrapper de `onnxruntime-node` carregando
 *     buffalo_s e cropando a face por face-detector (ex.: mediapipe-node
 *     ou um BlazeFace ONNX). Ver research §14.
 *   - Migrar o threshold pra `identitySimilarityMin = 0.55` (ArcFace cosine).
 *     Por ora deixar a calibração do dHash separada.
 */
export async function computeIdentitySimilarity(
  customerImage: Buffer,
  resultImage: Buffer,
): Promise<IdentitySimilarityResult> {
  const [customerGray, resultGray] = await Promise.all([
    faceRegionGray(customerImage),
    faceRegionGray(resultImage),
  ])
  const hashA = dHash(customerGray)
  const hashB = dHash(resultGray)
  const dist = hammingDistance(hashA, hashB)
  const similarity = (64 - dist) / 64
  return {
    similarity,
    hammingDistance: dist,
    method: 'dhash_face_region_proxy',
  }
}
