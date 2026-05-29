import 'server-only'
import sharp from 'sharp'

/**
 * Garment color fidelity — research §14 / P1.9.
 *
 * Mede ΔE2000 entre a cor média do PATCH apropriado da peça (input) e a cor
 * média do patch correspondente do resultado. Sem deps novas: só `sharp` +
 * álgebra de cor pura (sRGB→XYZ→Lab + CIEDE2000).
 *
 * Patch contextual por categoria (P1.9):
 *   - tops, outerwear         → upper-center (torso)
 *   - bottoms                 → lower-center (perna superior)
 *   - one-pieces, swimwear    → vertical average (3 patches verticais)
 *   - accessories, auto       → central patch (fallback)
 *
 * Para a foto da peça em si:
 *   - garmentPhotoType='flat-lay' (default) → central patch sempre
 *   - garmentPhotoType='model'              → mesma lógica do resultado
 */

export type GarmentCategory =
  | 'tops'
  | 'bottoms'
  | 'one-pieces'
  | 'outerwear'
  | 'swimwear'
  | 'accessories'
  | 'auto'

export type GarmentPhotoType = 'flat-lay' | 'model' | 'auto'

export type ColorMethod =
  | 'ciede2000_center_patch'
  | 'ciede2000_upper_center'
  | 'ciede2000_lower_center'
  | 'ciede2000_vertical_average'

export interface GarmentColorFidelityResult {
  deltaE: number
  sourceLab: { L: number; a: number; b: number }
  resultLab: { L: number; a: number; b: number }
  method: ColorMethod
  /** Qual região foi amostrada (debug/dashboard). */
  region: GarmentRegion
}

type GarmentRegion = 'central' | 'upper-center' | 'lower-center' | 'vertical-average'

const REGION_TO_METHOD: Record<GarmentRegion, ColorMethod> = {
  central: 'ciede2000_center_patch',
  'upper-center': 'ciede2000_upper_center',
  'lower-center': 'ciede2000_lower_center',
  'vertical-average': 'ciede2000_vertical_average',
}

const PATCH_FRACTION = 0.4

interface PatchSpec {
  widthFraction: number
  heightFraction: number
  /** Centro vertical do patch como fração da altura (0=top, 1=bottom). */
  centerYFraction: number
}

const PATCHES: Record<GarmentRegion, PatchSpec[]> = {
  central: [{ widthFraction: PATCH_FRACTION, heightFraction: PATCH_FRACTION, centerYFraction: 0.5 }],
  'upper-center': [{ widthFraction: 0.4, heightFraction: 0.25, centerYFraction: 0.35 }],
  'lower-center': [{ widthFraction: 0.35, heightFraction: 0.25, centerYFraction: 0.7 }],
  'vertical-average': [
    { widthFraction: 0.3, heightFraction: 0.15, centerYFraction: 0.3 },
    { widthFraction: 0.3, heightFraction: 0.15, centerYFraction: 0.5 },
    { widthFraction: 0.3, heightFraction: 0.15, centerYFraction: 0.7 },
  ],
}

export function regionForCategory(category: GarmentCategory): GarmentRegion {
  switch (category) {
    case 'tops':
    case 'outerwear':
      return 'upper-center'
    case 'bottoms':
      return 'lower-center'
    case 'one-pieces':
    case 'swimwear':
      return 'vertical-average'
    case 'accessories':
    case 'auto':
    default:
      return 'central'
  }
}

async function meanRgbAt(buffer: Buffer, patch: PatchSpec): Promise<[number, number, number]> {
  const meta = await sharp(buffer).metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  if (W === 0 || H === 0) throw new Error('color-check: metadata sem dimensões')

  const patchW = Math.max(1, Math.floor(W * patch.widthFraction))
  const patchH = Math.max(1, Math.floor(H * patch.heightFraction))
  const left = Math.max(0, Math.floor((W - patchW) / 2))
  const top = Math.max(
    0,
    Math.min(H - patchH, Math.floor(H * patch.centerYFraction - patchH / 2)),
  )

  // Sharp `.stats()` em uma chain `extract` por vezes devolve estatísticas
  // do buffer INTEIRO (ignorando o extract). Computamos a média manualmente
  // a partir do raw — é determinístico e ainda barato pra patches pequenos.
  const raw = await sharp(buffer)
    .extract({ left, top, width: patchW, height: patchH })
    .removeAlpha()
    .raw()
    .toBuffer()
  let sr = 0
  let sg = 0
  let sb = 0
  const pixelCount = patchW * patchH
  for (let i = 0; i < pixelCount; i += 1) {
    sr += raw[i * 3] ?? 0
    sg += raw[i * 3 + 1] ?? 0
    sb += raw[i * 3 + 2] ?? 0
  }
  return [sr / pixelCount, sg / pixelCount, sb / pixelCount]
}

async function meanRgbAtRegion(
  buffer: Buffer,
  region: GarmentRegion,
): Promise<[number, number, number]> {
  const patches = PATCHES[region]
  if (patches.length === 1) return meanRgbAt(buffer, patches[0]!)
  const samples = await Promise.all(patches.map((p) => meanRgbAt(buffer, p)))
  let r = 0
  let g = 0
  let b = 0
  for (const [pr, pg, pb] of samples) {
    r += pr
    g += pg
    b += pb
  }
  const n = samples.length
  return [r / n, g / n, b / n]
}

// ─── sRGB → Lab ──────────────────────────────────────────────────────────
function sRgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}
function fLab(t: number): number {
  const e = 216 / 24389
  const k = 24389 / 27
  return t > e ? Math.cbrt(t) : (k * t + 16) / 116
}
function rgbToLab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  const R = sRgbToLinear(r)
  const G = sRgbToLinear(g)
  const B = sRgbToLinear(b)
  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750
  const Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041
  const Xn = 0.95047
  const Yn = 1.0
  const Zn = 1.08883
  const fx = fLab(X / Xn)
  const fy = fLab(Y / Yn)
  const fz = fLab(Z / Zn)
  const L = 116 * fy - 16
  const a = 500 * (fx - fy)
  const bComp = 200 * (fy - fz)
  return { L, a, b: bComp }
}

function deg(r: number): number {
  return (r * 180) / Math.PI
}
function rad(d: number): number {
  return (d * Math.PI) / 180
}

export function ciede2000(
  l1: { L: number; a: number; b: number },
  l2: { L: number; a: number; b: number },
): number {
  const { L: L1, a: a1, b: b1 } = l1
  const { L: L2, a: a2, b: b2 } = l2
  const C1 = Math.hypot(a1, b1)
  const C2 = Math.hypot(a2, b2)
  const Cbar = (C1 + C2) / 2
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))))
  const a1p = (1 + G) * a1
  const a2p = (1 + G) * a2
  const C1p = Math.hypot(a1p, b1)
  const C2p = Math.hypot(a2p, b2)
  const h1p = hue(a1p, b1)
  const h2p = hue(a2p, b2)
  const dLp = L2 - L1
  const dCp = C2p - C1p
  let dhp: number
  if (C1p * C2p === 0) {
    dhp = 0
  } else {
    let diff = h2p - h1p
    if (diff > 180) diff -= 360
    else if (diff < -180) diff += 360
    dhp = diff
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2))
  const Lbar = (L1 + L2) / 2
  const Cbarp = (C1p + C2p) / 2
  let hbarp: number
  if (C1p * C2p === 0) {
    hbarp = h1p + h2p
  } else if (Math.abs(h1p - h2p) <= 180) {
    hbarp = (h1p + h2p) / 2
  } else if (h1p + h2p < 360) {
    hbarp = (h1p + h2p + 360) / 2
  } else {
    hbarp = (h1p + h2p - 360) / 2
  }
  const T =
    1 -
    0.17 * Math.cos(rad(hbarp - 30)) +
    0.24 * Math.cos(rad(2 * hbarp)) +
    0.32 * Math.cos(rad(3 * hbarp + 6)) -
    0.2 * Math.cos(rad(4 * hbarp - 63))
  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2))
  const Rc = 2 * Math.sqrt(Math.pow(Cbarp, 7) / (Math.pow(Cbarp, 7) + Math.pow(25, 7)))
  const Sl = 1 + (0.015 * Math.pow(Lbar - 50, 2)) / Math.sqrt(20 + Math.pow(Lbar - 50, 2))
  const Sc = 1 + 0.045 * Cbarp
  const Sh = 1 + 0.015 * Cbarp * T
  const Rt = -Math.sin(rad(2 * dTheta)) * Rc
  return Math.sqrt(
    Math.pow(dLp / Sl, 2) +
      Math.pow(dCp / Sc, 2) +
      Math.pow(dHp / Sh, 2) +
      Rt * (dCp / Sc) * (dHp / Sh),
  )
}

function hue(a: number, b: number): number {
  if (a === 0 && b === 0) return 0
  const h = deg(Math.atan2(b, a))
  return h >= 0 ? h : h + 360
}

export interface ColorFidelityOptions {
  category?: GarmentCategory
  /** Quando a peça vem em flat-lay, ignoramos categoria pro INPUT (sempre central). */
  garmentPhotoType?: GarmentPhotoType
}

/**
 * Aceita ambos:
 *   computeGarmentColorFidelity(garment, result, 'tops')
 *   computeGarmentColorFidelity(garment, result, { category: 'tops', garmentPhotoType: 'model' })
 */
export async function computeGarmentColorFidelity(
  garmentBuffer: Buffer,
  resultBuffer: Buffer,
  categoryOrOptions?: GarmentCategory | ColorFidelityOptions,
): Promise<GarmentColorFidelityResult> {
  const options: ColorFidelityOptions =
    typeof categoryOrOptions === 'string'
      ? { category: categoryOrOptions }
      : (categoryOrOptions ?? {})
  const category = options.category ?? 'auto'
  const garmentPhotoType = options.garmentPhotoType ?? 'auto'

  // Resultado: sempre usa região por categoria (peça vestida no corpo)
  const resultRegion = regionForCategory(category)
  // Input: se flat-lay/auto, central. Se on-model, segue categoria.
  const garmentRegion: GarmentRegion =
    garmentPhotoType === 'model' ? resultRegion : 'central'

  const [garmentRgb, resultRgb] = await Promise.all([
    meanRgbAtRegion(garmentBuffer, garmentRegion),
    meanRgbAtRegion(resultBuffer, resultRegion),
  ])
  const sourceLab = rgbToLab(garmentRgb[0]!, garmentRgb[1]!, garmentRgb[2]!)
  const resultLab = rgbToLab(resultRgb[0]!, resultRgb[1]!, resultRgb[2]!)
  return {
    deltaE: ciede2000(sourceLab, resultLab),
    sourceLab,
    resultLab,
    method: REGION_TO_METHOD[resultRegion],
    region: resultRegion,
  }
}
