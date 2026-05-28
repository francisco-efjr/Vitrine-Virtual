import { describe, expect, it } from 'vitest'
import {
  correlatePhoneToWrist,
  parsePhoneDetections,
} from '../mirror-selfie-detect'
import type { PoseDetection } from '../pose-detect'

function buildYoloOutput(
  detections: { xc: number; yc: number; w: number; h: number; confs: Record<number, number> }[],
  numAnchors: number,
  numClasses = 80,
): Float32Array {
  const features = 4 + numClasses
  const data = new Float32Array(features * numAnchors)
  detections.forEach((d, a) => {
    data[0 * numAnchors + a] = d.xc
    data[1 * numAnchors + a] = d.yc
    data[2 * numAnchors + a] = d.w
    data[3 * numAnchors + a] = d.h
    for (const [classIdx, conf] of Object.entries(d.confs)) {
      data[(4 + Number(classIdx)) * numAnchors + a] = conf
    }
  })
  return data
}

const PRE = { scale: 1, padX: 0, padY: 0, origW: 640, origH: 640 }

describe('parsePhoneDetections', () => {
  it('extrai apenas detecções de cell phone (class 67)', () => {
    const out = buildYoloOutput(
      [
        { xc: 100, yc: 200, w: 30, h: 60, confs: { 67: 0.8, 0: 0.1 } }, // phone
        { xc: 300, yc: 200, w: 100, h: 200, confs: { 0: 0.95, 67: 0.05 } }, // person, not phone
      ],
      10,
    )
    const dets = parsePhoneDetections(out, 80, 10, PRE)
    expect(dets).toHaveLength(1)
    expect(dets[0]!.confidence).toBeCloseTo(0.8)
  })

  it('ignora detecções abaixo do threshold de confiança', () => {
    const out = buildYoloOutput(
      [{ xc: 100, yc: 200, w: 30, h: 60, confs: { 67: 0.2 } }],
      10,
    )
    expect(parsePhoneDetections(out, 80, 10, PRE)).toHaveLength(0)
  })
})

describe('correlatePhoneToWrist', () => {
  function poseWith(wrist: { x: number; y: number; vis: number }, bbox: PoseDetection['bbox'] = [0, 0, 400, 600]): PoseDetection {
    const kpts: PoseDetection['keypoints'] = Array(17)
      .fill(null)
      .map(() => ({ x: 0, y: 0, vis: 0 }))
    kpts[9] = wrist // leftWrist
    return { bbox, confidence: 0.9, keypoints: kpts }
  }

  it('detecta quando celular está perto do pulso', () => {
    const phones = [{ bbox: [100, 200, 130, 260] as [number, number, number, number], confidence: 0.8 }]
    const poses = [poseWith({ x: 115, y: 230, vis: 0.9 })]
    const res = correlatePhoneToWrist(phones, poses)
    expect(res.detected).toBe(true)
    expect(res.closestDistance).toBeLessThan(5)
    expect(res.phoneConfidence).toBeCloseTo(0.8)
  })

  it('NÃO detecta quando celular está longe do pulso', () => {
    const phones = [{ bbox: [500, 500, 530, 560] as [number, number, number, number], confidence: 0.8 }]
    const poses = [poseWith({ x: 50, y: 100, vis: 0.9 })]
    const res = correlatePhoneToWrist(phones, poses)
    expect(res.detected).toBe(false)
  })

  it('ignora pulsos com visibility baixa', () => {
    const phones = [{ bbox: [100, 200, 130, 260] as [number, number, number, number], confidence: 0.8 }]
    const poses = [poseWith({ x: 115, y: 230, vis: 0.2 })] // invisível
    expect(correlatePhoneToWrist(phones, poses).detected).toBe(false)
  })

  it('escolhe o par phone × wrist com menor distância', () => {
    const phones = [
      { bbox: [50, 50, 80, 110] as [number, number, number, number], confidence: 0.7 },
      { bbox: [100, 100, 130, 160] as [number, number, number, number], confidence: 0.9 },
    ]
    const poses = [poseWith({ x: 115, y: 130, vis: 0.9 })]
    const res = correlatePhoneToWrist(phones, poses)
    expect(res.detected).toBe(true)
    expect(res.phoneConfidence).toBeCloseTo(0.9) // o mais próximo
  })

  it('lista vazia → não detectado', () => {
    expect(correlatePhoneToWrist([], []).detected).toBe(false)
    expect(correlatePhoneToWrist([{ bbox: [0, 0, 10, 10], confidence: 0.8 }], []).detected).toBe(false)
  })
})
