import 'server-only'
import sharp from 'sharp'

/**
 * Garment color fidelity — research deliverable §14.
 *
 * Mede ΔE2000 entre a cor média do patch central da peça (input) e a cor
 * média do patch central do resultado. Sem deps novas: só `sharp` + álgebra
 * de cor pura (sRGB→XYZ→Lab + CIEDE2000).
 *
 * Por que patch CENTRAL nas duas imagens:
 *   - Foto de peça: catalog flat-lay normalmente põe a peça centralizada.
 *   - Resultado: o try-on entrega o corpo enquadrado em 9:16; o centro
 *     vertical pega torso (tops) ou parte alta da perna (bottoms) — ambos
 *     dentro da peça. Não é perfeito pra "bottoms apenas" mas é o melhor
 *     proxy possível sem detector server-side.
 *
 * TODO (refinar quando tiver detector):
 *   - Usar `garmentCategory` pra escolher patch: 'tops' → upper-center,
 *     'bottoms' → lower-center, 'one-pieces' → vertical average.
 *   - Mediar a peça via segmentação simples (sharp `tile.png` + variance
 *     thresholding) pra evitar capturar fundo branco.
 */

export interface GarmentColorFidelityResult {
  /** Distância perceptual entre as cores médias (CIEDE2000). 0 = idêntica. */
  deltaE: number
  /** Cor média da peça original em Lab. */
  sourceLab: { L: number; a: number; b: number }
  /** Cor média na região correspondente do resultado em Lab. */
  resultLab: { L: number; a: number; b: number }
  /** Marca o método pra dashboards. */
  method: 'ciede2000_center_patch'
}

const PATCH_FRACTION = 0.4 // 40% × 40% do centro = patch robusto sem fundo

async function centralPatchMeanRgb(buffer: Buffer): Promise<[number, number, number]> {
  const meta = await sharp(buffer).metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  if (W === 0 || H === 0) throw new Error('color-check: metadata sem dimensões')

  const patchW = Math.max(1, Math.floor(W * PATCH_FRACTION))
  const patchH = Math.max(1, Math.floor(H * PATCH_FRACTION))
  const left = Math.floor((W - patchW) / 2)
  const top = Math.floor((H - patchH) / 2)

  // Sharp `stats()` no recorte dá os means RGB diretamente. Mais barato que
  // ler todos os pixels e tirar média no JS.
  const stats = await sharp(buffer)
    .extract({ left, top, width: patchW, height: patchH })
    .removeAlpha()
    .stats()

  const channels = stats.channels
  const r = channels[0]?.mean ?? 0
  const g = channels[1]?.mean ?? 0
  const b = channels[2]?.mean ?? 0
  return [r, g, b]
}

// ─── sRGB → Lab ──────────────────────────────────────────────────────────
// Referência: http://www.brucelindbloom.com/index.html?Eqn_RGB_to_XYZ.html
// D65 / 2°. sRGB com inverse companding gamma 2.4.

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
  // sRGB D65 matrix
  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750
  const Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041
  // White D65
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

// ─── CIEDE2000 ────────────────────────────────────────────────────────────
// Referência: Sharma, Wu & Dalal (2005) - "The CIEDE2000 Color-Difference
// Formula: Implementation Notes, Supplementary Test Data, and Mathematical
// Observations". https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/

function deg(rad: number): number {
  return (rad * 180) / Math.PI
}
function rad(deg: number): number {
  return (deg * Math.PI) / 180
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

  const kL = 1
  const kC = 1
  const kH = 1

  const dE = Math.sqrt(
    Math.pow(dLp / (kL * Sl), 2) +
      Math.pow(dCp / (kC * Sc), 2) +
      Math.pow(dHp / (kH * Sh), 2) +
      Rt * (dCp / (kC * Sc)) * (dHp / (kH * Sh)),
  )
  return dE
}

function hue(a: number, b: number): number {
  if (a === 0 && b === 0) return 0
  const h = deg(Math.atan2(b, a))
  return h >= 0 ? h : h + 360
}

export async function computeGarmentColorFidelity(
  garmentBuffer: Buffer,
  resultBuffer: Buffer,
): Promise<GarmentColorFidelityResult> {
  const [garmentRgb, resultRgb] = await Promise.all([
    centralPatchMeanRgb(garmentBuffer),
    centralPatchMeanRgb(resultBuffer),
  ])
  const sourceLab = rgbToLab(garmentRgb[0]!, garmentRgb[1]!, garmentRgb[2]!)
  const resultLab = rgbToLab(resultRgb[0]!, resultRgb[1]!, resultRgb[2]!)
  return {
    deltaE: ciede2000(sourceLab, resultLab),
    sourceLab,
    resultLab,
    method: 'ciede2000_center_patch',
  }
}
