import { afterEach, describe, expect, it } from 'vitest'
import sharp from 'sharp'
import * as ort from 'onnxruntime-node'
import {
  __resetAnatomyCacheForTests,
  __setAnatomySessionForTests,
  aggregateLimbs,
  checkAnatomy,
  nmsPoses,
  parsePoseDetections,
  type PoseDetection,
} from '../anatomy-sanity'

afterEach(() => {
  __resetAnatomyCacheForTests()
})

/**
 * Constrói um output cru YOLOv8-pose [56, N] linearizado em row-major,
 * a partir de poses planejadas com visibility por keypoint.
 */
function buildPoseOutput(
  poses: {
    xc: number
    yc: number
    w: number
    h: number
    conf: number
    /** Visibilidade por keypoint (17 entradas). */
    kptVis: number[]
  }[],
  totalAnchors: number,
): Float32Array {
  const features = 56
  const data = new Float32Array(features * totalAnchors)
  poses.forEach((p, a) => {
    data[0 * totalAnchors + a] = p.xc
    data[1 * totalAnchors + a] = p.yc
    data[2 * totalAnchors + a] = p.w
    data[3 * totalAnchors + a] = p.h
    data[4 * totalAnchors + a] = p.conf
    for (let k = 0; k < 17; k += 1) {
      data[(5 + k * 3) * totalAnchors + a] = p.xc
      data[(5 + k * 3 + 1) * totalAnchors + a] = p.yc
      data[(5 + k * 3 + 2) * totalAnchors + a] = p.kptVis[k] ?? 0
    }
  })
  return data
}

function visAll(value = 0.9): number[] {
  return Array(17).fill(value)
}

describe('parsePoseDetections', () => {
  it('extrai poses com confidence acima do mínimo', () => {
    const out = buildPoseOutput(
      [
        { xc: 100, yc: 200, w: 50, h: 100, conf: 0.9, kptVis: visAll() },
        { xc: 300, yc: 200, w: 50, h: 100, conf: 0.2, kptVis: visAll() },
      ],
      10,
    )
    const dets = parsePoseDetections(out, 10)
    expect(dets).toHaveLength(1)
    expect(dets[0]!.confidence).toBeCloseTo(0.9)
    expect(dets[0]!.keypoints).toHaveLength(17)
  })

  it('extrai visibility por keypoint corretamente', () => {
    const vis = visAll(0)
    vis[9] = 0.95 // leftWrist visível
    vis[10] = 0.85 // rightWrist visível
    const out = buildPoseOutput(
      [{ xc: 320, yc: 320, w: 100, h: 200, conf: 0.9, kptVis: vis }],
      1,
    )
    const dets = parsePoseDetections(out, 1)
    expect(dets[0]!.keypoints[9]!.vis).toBeCloseTo(0.95)
    expect(dets[0]!.keypoints[10]!.vis).toBeCloseTo(0.85)
    expect(dets[0]!.keypoints[0]!.vis).toBeCloseTo(0)
  })
})

describe('nmsPoses', () => {
  it('suprime sobreposições, mantém a de maior confidence', () => {
    const a: PoseDetection = {
      bbox: [0, 0, 100, 100],
      confidence: 0.7,
      keypoints: Array(17).fill({ x: 0, y: 0, vis: 0.9 }),
    }
    const b: PoseDetection = {
      bbox: [10, 10, 110, 110],
      confidence: 0.95,
      keypoints: Array(17).fill({ x: 0, y: 0, vis: 0.9 }),
    }
    const kept = nmsPoses([a, b])
    expect(kept).toHaveLength(1)
    expect(kept[0]!.confidence).toBeCloseTo(0.95)
  })
})

describe('aggregateLimbs', () => {
  it('soma punhos/tornozelos visíveis ao longo de múltiplas pessoas', () => {
    const vis = visAll(0)
    vis[9] = 0.9
    vis[10] = 0.9
    vis[15] = 0.9
    vis[16] = 0.9
    const fakePose: PoseDetection = {
      bbox: [0, 0, 100, 100],
      confidence: 0.9,
      keypoints: vis.map((v) => ({ x: 0, y: 0, vis: v })),
    }
    const totals = aggregateLimbs([fakePose, fakePose])
    expect(totals.personCount).toBe(2)
    expect(totals.visibleWrists).toBe(4)
    expect(totals.visibleAnkles).toBe(4)
  })

  it('ignora keypoints com visibility abaixo do threshold', () => {
    const vis = visAll(0)
    vis[9] = 0.4 // abaixo do 0.5
    vis[10] = 0.9
    const fakePose: PoseDetection = {
      bbox: [0, 0, 100, 100],
      confidence: 0.9,
      keypoints: vis.map((v) => ({ x: 0, y: 0, vis: v })),
    }
    const totals = aggregateLimbs([fakePose])
    expect(totals.visibleWrists).toBe(1)
  })
})

describe('checkAnatomy (integration via mock session)', () => {
  async function blankImage(): Promise<Buffer> {
    return sharp({
      create: { width: 640, height: 640, channels: 3, background: { r: 128, g: 128, b: 128 } },
    })
      .png()
      .toBuffer()
  }

  /** Mocka session que devolve uma lista pré-pactuada por chamada (1ª = customer, 2ª = result). */
  function mockSessionFromOutputs(outputs: Float32Array[]): ort.InferenceSession {
    let call = 0
    return {
      inputNames: ['images'],
      outputNames: ['output0'],
      run: async () => {
        const data = outputs[call++] ?? outputs[outputs.length - 1]!
        return { output0: new ort.Tensor('float32', data, [1, 56, data.length / 56]) }
      },
    } as unknown as ort.InferenceSession
  }

  it('retorna unavailable quando session é null', async () => {
    __setAnatomySessionForTests(null)
    const img = await blankImage()
    const res = await checkAnatomy(img, img)
    expect(res.method).toBe('unavailable')
    expect(res.pass).toBe(true)
  })

  it('pass=true quando input e output têm mesma contagem', async () => {
    const NUM_ANCHORS = 100
    const oneArmedPerson = buildPoseOutput(
      [{ xc: 320, yc: 320, w: 200, h: 400, conf: 0.9, kptVis: (() => {
        const v = visAll(0)
        v[9] = 0.9 // leftWrist
        v[15] = 0.9
        v[16] = 0.9
        return v
      })() }],
      NUM_ANCHORS,
    )
    __setAnatomySessionForTests(mockSessionFromOutputs([oneArmedPerson, oneArmedPerson]))
    const img = await blankImage()
    const res = await checkAnatomy(img, img)
    expect(res.method).toBe('yolov8n_pose')
    expect(res.pass).toBe(true)
    expect(res.flags).toEqual([])
    expect(res.input?.visibleWrists).toBe(1)
    expect(res.output?.visibleWrists).toBe(1)
  })

  it('flag extra_arms quando resultado tem mais punhos que o input', async () => {
    const NUM_ANCHORS = 100
    const oneWrist = (() => {
      const v = visAll(0)
      v[9] = 0.9 // 1 wrist
      return v
    })()
    const threeWrists = (() => {
      const v = visAll(0)
      v[9] = 0.9
      v[10] = 0.9
      // simulamos pessoa extra com NMS por bbox distinto na próxima pose
      return v
    })()
    const inputOut = buildPoseOutput(
      [{ xc: 320, yc: 320, w: 200, h: 400, conf: 0.9, kptVis: oneWrist }],
      NUM_ANCHORS,
    )
    const resultOut = buildPoseOutput(
      [
        { xc: 200, yc: 320, w: 200, h: 400, conf: 0.9, kptVis: threeWrists },
        { xc: 500, yc: 320, w: 200, h: 400, conf: 0.85, kptVis: threeWrists },
      ],
      NUM_ANCHORS,
    )
    __setAnatomySessionForTests(mockSessionFromOutputs([inputOut, resultOut]))
    const img = await blankImage()
    const res = await checkAnatomy(img, img)
    expect(res.pass).toBe(false)
    expect(res.flags).toContain('extra_person')
    expect(res.flags).toContain('extra_arms')
  })
})
