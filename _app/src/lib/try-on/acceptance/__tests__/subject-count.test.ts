import { afterEach, describe, expect, it } from 'vitest'
import sharp from 'sharp'
import * as ort from 'onnxruntime-node'
import {
  __resetSubjectCountCacheForTests,
  __setSubjectCountSessionForTests,
  countPersons,
  nonMaxSuppression,
  parsePersonDetections,
  type Detection,
} from '../subject-count'

afterEach(() => {
  __resetSubjectCountCacheForTests()
})

/**
 * Constrói um output cru YOLOv8-like a partir de detections planejadas.
 * Layout: [4 + numClasses, numAnchors] linearizado em row-major.
 * Em cada anchor, escrevemos xc/yc/w/h + uma pessoa nas coords pedidas.
 */
function buildYoloOutput(
  numClasses: number,
  detections: { xc: number; yc: number; w: number; h: number; conf: number }[],
  totalAnchors: number,
): Float32Array {
  const features = 4 + numClasses
  const data = new Float32Array(features * totalAnchors)
  detections.forEach((d, a) => {
    data[0 * totalAnchors + a] = d.xc
    data[1 * totalAnchors + a] = d.yc
    data[2 * totalAnchors + a] = d.w
    data[3 * totalAnchors + a] = d.h
    data[(4 + 0) * totalAnchors + a] = d.conf // class 0 = person
  })
  return data
}

describe('parsePersonDetections', () => {
  const pre = { scale: 1, padX: 0, padY: 0, origW: 640, origH: 640 }

  it('extrai apenas pessoas com confidence acima do threshold', () => {
    const out = buildYoloOutput(
      80,
      [
        { xc: 100, yc: 200, w: 50, h: 100, conf: 0.9 },
        { xc: 300, yc: 200, w: 50, h: 100, conf: 0.2 }, // abaixo do threshold
      ],
      10,
    )
    const dets = parsePersonDetections(out, 80, 10, pre)
    expect(dets).toHaveLength(1)
    expect(dets[0]!.confidence).toBeCloseTo(0.9)
  })

  it('converte xywh→xyxy corretamente', () => {
    const out = buildYoloOutput(
      80,
      [{ xc: 320, yc: 320, w: 100, h: 200, conf: 0.95 }],
      1,
    )
    const dets = parsePersonDetections(out, 80, 1, pre)
    expect(dets[0]!.bbox).toEqual([270, 220, 370, 420])
  })

  it('desfaz letterbox (scale + pad)', () => {
    // Suponha imagem 320×640: letterbox põe padX=160 no eixo X
    const out = buildYoloOutput(
      80,
      [{ xc: 320, yc: 320, w: 100, h: 200, conf: 0.95 }],
      1,
    )
    const dets = parsePersonDetections(out, 80, 1, {
      scale: 1,
      padX: 160,
      padY: 0,
      origW: 320,
      origH: 640,
    })
    // Centro do bbox no espaço original: (320-160)/1 = 160
    expect(dets[0]!.bbox[0]).toBe(110) // 160 - 50
    expect(dets[0]!.bbox[2]).toBe(210) // 160 + 50
  })

  it('clamp na imagem original (sem coords negativas ou estouro)', () => {
    const out = buildYoloOutput(
      80,
      [{ xc: 10, yc: 10, w: 100, h: 100, conf: 0.9 }],
      1,
    )
    const dets = parsePersonDetections(out, 80, 1, pre)
    expect(dets[0]!.bbox[0]).toBe(0)
    expect(dets[0]!.bbox[1]).toBe(0)
  })
})

describe('nonMaxSuppression', () => {
  it('preserva detecções não-sobrepostas', () => {
    const dets: Detection[] = [
      { bbox: [0, 0, 100, 100], confidence: 0.9 },
      { bbox: [200, 200, 300, 300], confidence: 0.85 },
    ]
    expect(nonMaxSuppression(dets)).toHaveLength(2)
  })

  it('suprime sobreposições mantendo a de maior confidence', () => {
    const dets: Detection[] = [
      { bbox: [0, 0, 100, 100], confidence: 0.7 },
      { bbox: [10, 10, 110, 110], confidence: 0.95 }, // IoU alto com a primeira
    ]
    const kept = nonMaxSuppression(dets)
    expect(kept).toHaveLength(1)
    expect(kept[0]!.confidence).toBeCloseTo(0.95)
  })

  it('IoU exatamente no threshold NÃO suprime', () => {
    // Boxes adjacentes sem sobreposição: IoU = 0
    const dets: Detection[] = [
      { bbox: [0, 0, 100, 100], confidence: 0.9 },
      { bbox: [100, 0, 200, 100], confidence: 0.85 },
    ]
    expect(nonMaxSuppression(dets)).toHaveLength(2)
  })
})

describe('countPersons (graceful degradation)', () => {
  it('retorna unavailable quando session é null', async () => {
    __setSubjectCountSessionForTests(null)
    const img = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer()
    const res = await countPersons(img)
    expect(res.method).toBe('unavailable')
    expect(res.reason).toBe('model_not_loaded')
    expect(res.count).toBe(0)
  })

  it('roda inferência completa via mock session', async () => {
    // Mock minimalista de InferenceSession: aceita o feed e devolve um
    // output Float32Array com 1 pessoa detectada.
    const NUM_ANCHORS = 8400
    const fakeOutput = buildYoloOutput(
      80,
      [{ xc: 320, yc: 320, w: 200, h: 400, conf: 0.92 }],
      NUM_ANCHORS,
    )
    const fakeTensor = new ort.Tensor('float32', fakeOutput, [1, 84, NUM_ANCHORS])

    const fakeSession = {
      inputNames: ['images'],
      outputNames: ['output0'],
      run: async () => ({ output0: fakeTensor }),
    } as unknown as ort.InferenceSession

    __setSubjectCountSessionForTests(fakeSession)

    const img = await sharp({
      create: { width: 640, height: 640, channels: 3, background: { r: 128, g: 128, b: 128 } },
    })
      .png()
      .toBuffer()

    const res = await countPersons(img)
    expect(res.method).toBe('yolov8n_onnx')
    expect(res.count).toBe(1)
    expect(res.confidences[0]).toBeCloseTo(0.92, 2)
  })

  it('count > 1 quando há colagem (2 pessoas em regiões distintas)', async () => {
    const NUM_ANCHORS = 8400
    const fakeOutput = buildYoloOutput(
      80,
      [
        { xc: 150, yc: 320, w: 150, h: 400, conf: 0.9 }, // pessoa esquerda
        { xc: 490, yc: 320, w: 150, h: 400, conf: 0.88 }, // pessoa direita
      ],
      NUM_ANCHORS,
    )
    const fakeTensor = new ort.Tensor('float32', fakeOutput, [1, 84, NUM_ANCHORS])

    const fakeSession = {
      inputNames: ['images'],
      outputNames: ['output0'],
      run: async () => ({ output0: fakeTensor }),
    } as unknown as ort.InferenceSession

    __setSubjectCountSessionForTests(fakeSession)

    const img = await sharp({
      create: { width: 640, height: 640, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer()

    const res = await countPersons(img)
    expect(res.count).toBe(2)
  })
})
