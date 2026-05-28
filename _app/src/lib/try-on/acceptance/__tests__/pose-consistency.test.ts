import { describe, expect, it } from 'vitest'
import { comparePoses } from '../pose-consistency'
import type { PoseDetection } from '../pose-detect'

function makePose(
  bbox: [number, number, number, number],
  kpts: { x: number; y: number; vis?: number }[],
): PoseDetection {
  const keypoints: PoseDetection['keypoints'] = Array(17)
    .fill(null)
    .map((_, i) => ({
      x: kpts[i]?.x ?? 0,
      y: kpts[i]?.y ?? 0,
      vis: kpts[i]?.vis ?? 0.9,
    }))
  return { bbox, confidence: 0.9, keypoints }
}

describe('comparePoses', () => {
  it('poses idênticas → distance ≈ 0, pass=true', () => {
    const kpts = Array(17)
      .fill(null)
      .map((_, i) => ({ x: i * 10, y: i * 5, vis: 0.9 }))
    const p = makePose([0, 0, 200, 400], kpts)
    const cmp = comparePoses(p, p)
    expect(cmp.meanNormalizedDistance).toBeCloseTo(0)
    expect(cmp.pass).toBe(true)
    expect(cmp.comparedKeypoints).toBe(17)
  })

  it('flag quando pose muda significativamente', () => {
    const kptsA = Array(17)
      .fill(null)
      .map(() => ({ x: 100, y: 200, vis: 0.9 }))
    const kptsB = Array(17)
      .fill(null)
      .map(() => ({ x: 300, y: 200, vis: 0.9 }))
    // Diagonal da bbox = sqrt(200^2 + 400^2) ≈ 447
    // Distância média = 200, normalizada = 200/447 ≈ 0.45 > 0.18 threshold
    const cmp = comparePoses(
      makePose([0, 0, 200, 400], kptsA),
      makePose([0, 0, 200, 400], kptsB),
    )
    expect(cmp.meanNormalizedDistance).toBeGreaterThan(0.18)
    expect(cmp.pass).toBe(false)
  })

  it('ignora keypoints abaixo do visibility threshold', () => {
    const kptsA = Array(17)
      .fill(null)
      .map((_, i) => ({ x: 100, y: 200, vis: i === 0 ? 0.95 : 0.1 }))
    const kptsB = Array(17)
      .fill(null)
      .map((_, i) => ({ x: 100, y: 200, vis: i === 0 ? 0.95 : 0.1 }))
    const cmp = comparePoses(
      makePose([0, 0, 200, 400], kptsA),
      makePose([0, 0, 200, 400], kptsB),
    )
    expect(cmp.comparedKeypoints).toBe(1) // só o keypoint 0
  })

  it('comparedKeypoints=0 quando nenhum keypoint visível em ambos', () => {
    const kpts = Array(17)
      .fill(null)
      .map(() => ({ x: 0, y: 0, vis: 0.1 }))
    const cmp = comparePoses(
      makePose([0, 0, 200, 400], kpts),
      makePose([0, 0, 200, 400], kpts),
    )
    expect(cmp.comparedKeypoints).toBe(0)
    expect(cmp.pass).toBe(true) // fail-safe
  })

  it('lida com bbox zero (no-op)', () => {
    const kpts = Array(17)
      .fill(null)
      .map(() => ({ x: 0, y: 0, vis: 0.9 }))
    const cmp = comparePoses(
      makePose([0, 0, 0, 0], kpts),
      makePose([0, 0, 0, 0], kpts),
    )
    expect(cmp.pass).toBe(true)
    expect(cmp.meanNormalizedDistance).toBe(0)
  })

  it('respeita threshold customizado', () => {
    const kptsA = Array(17)
      .fill(null)
      .map(() => ({ x: 100, y: 200, vis: 0.9 }))
    const kptsB = Array(17)
      .fill(null)
      .map(() => ({ x: 130, y: 200, vis: 0.9 }))
    // Pequeno deslocamento — distância normalizada baixa
    const cmpStrict = comparePoses(
      makePose([0, 0, 200, 400], kptsA),
      makePose([0, 0, 200, 400], kptsB),
      0.01,
    )
    expect(cmpStrict.pass).toBe(false) // threshold muito apertado
    const cmpLoose = comparePoses(
      makePose([0, 0, 200, 400], kptsA),
      makePose([0, 0, 200, 400], kptsB),
      0.5,
    )
    expect(cmpLoose.pass).toBe(true) // threshold loose
  })
})
