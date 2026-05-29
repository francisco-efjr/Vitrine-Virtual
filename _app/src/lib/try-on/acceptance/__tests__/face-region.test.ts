import { describe, expect, it } from 'vitest'
import { faceBboxFromPose } from '../face-region'
import type { PoseDetection } from '../pose-detect'

function poseWith(
  kpts: Partial<Record<number, { x: number; y: number; vis: number }>>,
): PoseDetection {
  const all: PoseDetection['keypoints'] = []
  for (let i = 0; i < 17; i += 1) {
    all.push(kpts[i] ?? { x: 0, y: 0, vis: 0 })
  }
  return {
    bbox: [0, 0, 640, 640],
    confidence: 0.9,
    keypoints: all,
  }
}

describe('faceBboxFromPose', () => {
  it('estima bbox a partir de nose + orelhas', () => {
    const pose = poseWith({
      0: { x: 320, y: 200, vis: 0.95 }, // nose
      3: { x: 270, y: 200, vis: 0.9 }, // leftEar
      4: { x: 370, y: 200, vis: 0.9 }, // rightEar
    })
    const bbox = faceBboxFromPose(pose, 640, 640)
    expect(bbox).not.toBeNull()
    const [x1, y1, x2, y2] = bbox!
    expect(x2 - x1).toBeGreaterThan(60)
    expect(y2 - y1).toBeGreaterThan(60)
    // Centro próximo do nose
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2
    expect(Math.abs(cx - 320)).toBeLessThan(5)
    expect(Math.abs(cy - 200)).toBeLessThan(5)
  })

  it('cai pros olhos quando orelhas não estão visíveis', () => {
    const pose = poseWith({
      0: { x: 320, y: 200, vis: 0.95 }, // nose
      1: { x: 305, y: 195, vis: 0.9 }, // leftEye
      2: { x: 335, y: 195, vis: 0.9 }, // rightEye
    })
    const bbox = faceBboxFromPose(pose, 640, 640)
    expect(bbox).not.toBeNull()
  })

  it('retorna null quando nose não tá visível', () => {
    const pose = poseWith({
      0: { x: 320, y: 200, vis: 0.1 },
    })
    expect(faceBboxFromPose(pose, 640, 640)).toBeNull()
  })

  it('retorna null quando faltam keypoints pra estimar largura', () => {
    const pose = poseWith({
      0: { x: 320, y: 200, vis: 0.9 },
      // sem orelhas ou olhos visíveis
    })
    expect(faceBboxFromPose(pose, 640, 640)).toBeNull()
  })

  it('clamp pra dentro da imagem', () => {
    const pose = poseWith({
      0: { x: 5, y: 5, vis: 0.9 },
      3: { x: 0, y: 5, vis: 0.9 },
      4: { x: 10, y: 5, vis: 0.9 },
    })
    const bbox = faceBboxFromPose(pose, 640, 640)
    if (bbox) {
      expect(bbox[0]).toBeGreaterThanOrEqual(0)
      expect(bbox[1]).toBeGreaterThanOrEqual(0)
    }
  })
})
