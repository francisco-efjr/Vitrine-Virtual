import sharp from 'sharp'

export interface ImageDimensions {
  width: number | null
  height: number | null
  format?: string
  sizeBytes: number
}

export interface ImageBounds {
  left: number
  top: number
  width: number
  height: number
}

export interface CompositionNormalizationResult {
  buffer: Buffer
  cropped: boolean
  original: ImageDimensions
  output: ImageDimensions
  foregroundBounds?: ImageBounds
  cropBounds?: ImageBounds
}

const TARGET_SUBJECT_HEIGHT_FILL = 0.88
const TARGET_SUBJECT_WIDTH_FILL = 0.74
const FOREGROUND_DISTANCE_THRESHOLD = 36

export async function inspectImageBuffer(buf: Buffer): Promise<ImageDimensions> {
  const metadata = await sharp(buf).metadata()
  return {
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    format: metadata.format,
    sizeBytes: buf.byteLength,
  }
}

/**
 * Cheap server-side heuristic: does the garment image likely contain a person
 * (skin-tone cluster in the upper portion)?
 *
 * We use this to decide whether to inject an explicit "transfer ONLY the
 * garment, not the model" reminder adjacent to the garment image in the
 * Gemini prompt. Skin-tone detection uses the YCbCr range from the standard
 * skin-detection literature — works across light to dark skin tones with low
 * false-positive rate on neutral garment backgrounds.
 *
 * No new deps: uses `sharp` (already a project dep).
 */
export async function detectGarmentHasPerson(base64OrBuffer: string | Buffer): Promise<boolean> {
  try {
    const buf = typeof base64OrBuffer === 'string'
      ? Buffer.from(base64OrBuffer, 'base64')
      : base64OrBuffer
    const { data, info } = await sharp(buf)
      .resize(256, 256, { fit: 'inside' })
      .removeAlpha()
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true })
    const W = info.width
    const H = info.height
    if (W === 0 || H === 0) return false

    // Upper 45% — where a face/neck would live in a typical garment-on-model
    // product shot (head-and-shoulders or full-body). Most flat-lay shots
    // have minimal skin tone here.
    const upperBound = Math.floor(H * 0.45)
    let skinCount = 0
    let totalCount = 0
    for (let y = 0; y < upperBound; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 3
        const r = data[i] ?? 0
        const g = data[i + 1] ?? 0
        const b = data[i + 2] ?? 0
        totalCount++
        if (isSkinToneRGB(r, g, b)) skinCount++
      }
    }
    if (totalCount === 0) return false
    const skinFraction = skinCount / totalCount
    // 3% threshold — conservative. Validated against neutral white/beige
    // backgrounds (which can have low Cb that brushes the threshold).
    return skinFraction >= 0.03
  } catch {
    return false
  }
}

function isSkinToneRGB(r: number, g: number, b: number): boolean {
  // YCbCr skin-tone range (Chai & Ngan 1999 + Hsu et al. 2002 refinement).
  // Covers Fitzpatrick types I–VI with low false-positive rate.
  const Y = 0.299 * r + 0.587 * g + 0.114 * b
  const Cr = (r - Y) * 0.713 + 128
  const Cb = (b - Y) * 0.564 + 128
  return (
    Cr >= 133 &&
    Cr <= 173 &&
    Cb >= 77 &&
    Cb <= 127 &&
    r > 60 &&
    r < 245 &&
    // Exclude pure white / near-white (background): require some chromaticity.
    Math.max(r, g, b) - Math.min(r, g, b) > 10
  )
}

export interface CollageDetectionResult {
  isCollage: boolean
  reason?: 'vertical_gap' | 'multiple_blobs'
  details?: {
    gapStartFraction?: number
    gapEndFraction?: number
    gapWidthFraction?: number
  }
}

/**
 * Detects the "two-people side-by-side collage" hallucination that Gemini
 * 2.5 Flash Image produces on multi-image inputs. Heuristic: scan column
 * counts of foreground pixels; a clear vertical gap between two foreground
 * clusters indicates a diptych/collage.
 *
 * Returns `isCollage: false` on any error (best-effort, never blocks a
 * legitimate single-subject generation).
 */
export async function detectCollageInResult(inputBuffer: Buffer): Promise<CollageDetectionResult> {
  try {
    const { data, info } = await sharp(inputBuffer)
      .removeAlpha()
      .flatten({ background: '#FFFFFF' })
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true })

    const width = info.width
    const height = info.height
    const channels = info.channels
    if (!width || !height || channels < 3) return { isCollage: false }

    const background = estimateBackgroundColor(data, width, height, channels)
    const colCounts = new Uint32Array(width)

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * channels
      for (let x = 0; x < width; x++) {
        const offset = rowOffset + x * channels
        if (!isForegroundPixel(data, offset, background)) continue
        colCounts[x] = (colCounts[x] ?? 0) + 1
      }
    }

    // Foreground present in a column if it has at least 1% of height covered.
    const presenceThreshold = Math.max(4, Math.ceil(height * 0.01))
    const present: boolean[] = new Array(width)
    for (let x = 0; x < width; x++) {
      present[x] = (colCounts[x] ?? 0) >= presenceThreshold
    }

    // Bounds of foreground extent.
    let firstX = -1
    let lastX = -1
    for (let x = 0; x < width; x++) {
      if (present[x]) {
        if (firstX === -1) firstX = x
        lastX = x
      }
    }
    if (firstX === -1 || lastX === -1 || lastX - firstX < width * 0.3) {
      // Foreground span too narrow to be a collage of two subjects.
      return { isCollage: false }
    }

    // Look for a continuous absent stretch BETWEEN firstX and lastX.
    // Must be at least 8% of total width and located roughly in the middle
    // 60% of the foreground span (rules out the bottom of a single subject
    // with negative space between legs).
    const minGapWidth = Math.max(20, Math.ceil(width * 0.08))
    const fgSpanStart = firstX + (lastX - firstX) * 0.2
    const fgSpanEnd = firstX + (lastX - firstX) * 0.8

    let gapStart = -1
    let bestGap: { start: number; end: number } | null = null
    for (let x = firstX; x <= lastX; x++) {
      if (!present[x]) {
        if (gapStart === -1) gapStart = x
      } else {
        if (gapStart !== -1) {
          const gapEnd = x - 1
          const gapWidth = gapEnd - gapStart + 1
          const gapMid = (gapStart + gapEnd) / 2
          if (
            gapWidth >= minGapWidth &&
            gapMid >= fgSpanStart &&
            gapMid <= fgSpanEnd &&
            (!bestGap || gapWidth > bestGap.end - bestGap.start + 1)
          ) {
            bestGap = { start: gapStart, end: gapEnd }
          }
          gapStart = -1
        }
      }
    }

    if (!bestGap) return { isCollage: false }

    return {
      isCollage: true,
      reason: 'vertical_gap',
      details: {
        gapStartFraction: bestGap.start / width,
        gapEndFraction: bestGap.end / width,
        gapWidthFraction: (bestGap.end - bestGap.start + 1) / width,
      },
    }
  } catch {
    return { isCollage: false }
  }
}

export async function normalizeTryOnResultComposition(
  inputBuffer: Buffer,
): Promise<CompositionNormalizationResult> {
  const original = await inspectImageBuffer(inputBuffer)
  if (!original.width || !original.height) {
    return { buffer: inputBuffer, cropped: false, original, output: original }
  }

  const foregroundBounds = await detectForegroundBounds(inputBuffer)
  if (!foregroundBounds) {
    return { buffer: inputBuffer, cropped: false, original, output: original }
  }

  const cropBounds = buildSubjectCrop({
    foreground: foregroundBounds,
    imageWidth: original.width,
    imageHeight: original.height,
  })

  const shouldCrop =
    cropBounds.width < original.width * 0.96 || cropBounds.height < original.height * 0.96

  if (!shouldCrop) {
    return {
      buffer: inputBuffer,
      cropped: false,
      original,
      output: original,
      foregroundBounds,
      cropBounds,
    }
  }

  const buffer = await sharp(inputBuffer)
    .extract(cropBounds)
    .resize(original.width, original.height, { fit: 'fill' })
    .jpeg({ quality: 92 })
    .toBuffer()

  return {
    buffer,
    cropped: true,
    original,
    output: await inspectImageBuffer(buffer),
    foregroundBounds,
    cropBounds,
  }
}

async function detectForegroundBounds(inputBuffer: Buffer): Promise<ImageBounds | null> {
  const { data, info } = await sharp(inputBuffer)
    .removeAlpha()
    .flatten({ background: '#FFFFFF' })
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true })

  const width = info.width
  const height = info.height
  const channels = info.channels
  if (!width || !height || channels < 3) return null

  const background = estimateBackgroundColor(data, width, height, channels)
  const rowCounts = new Uint32Array(height)
  const colCounts = new Uint32Array(width)

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * channels
    for (let x = 0; x < width; x++) {
      const offset = rowOffset + x * channels
      if (!isForegroundPixel(data, offset, background)) continue
      rowCounts[y] = (rowCounts[y] ?? 0) + 1
      colCounts[x] = (colCounts[x] ?? 0) + 1
    }
  }

  const minRowPixels = Math.max(5, Math.ceil(width * 0.006))
  const minColPixels = Math.max(5, Math.ceil(height * 0.006))
  const top = firstIndexAtLeast(rowCounts, minRowPixels)
  const bottom = lastIndexAtLeast(rowCounts, minRowPixels)
  const left = firstIndexAtLeast(colCounts, minColPixels)
  const right = lastIndexAtLeast(colCounts, minColPixels)

  if (top == null || bottom == null || left == null || right == null) return null

  const bounds = {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  }

  const areaRatio = (bounds.width * bounds.height) / (width * height)
  if (areaRatio < 0.05 || areaRatio > 0.92) return null

  return bounds
}

function buildSubjectCrop({
  foreground,
  imageWidth,
  imageHeight,
}: {
  foreground: ImageBounds
  imageWidth: number
  imageHeight: number
}): ImageBounds {
  const imageRatio = imageWidth / imageHeight
  let cropHeight = Math.ceil(foreground.height / TARGET_SUBJECT_HEIGHT_FILL)
  let cropWidth = Math.ceil(cropHeight * imageRatio)

  const minCropWidth = Math.ceil(foreground.width / TARGET_SUBJECT_WIDTH_FILL)
  if (cropWidth < minCropWidth) {
    cropWidth = minCropWidth
    cropHeight = Math.ceil(cropWidth / imageRatio)
  }

  cropWidth = Math.min(cropWidth, imageWidth)
  cropHeight = Math.min(cropHeight, imageHeight)

  if (cropWidth / cropHeight > imageRatio) {
    cropWidth = Math.min(imageWidth, Math.round(cropHeight * imageRatio))
  } else {
    cropHeight = Math.min(imageHeight, Math.round(cropWidth / imageRatio))
  }

  const extraY = cropHeight - foreground.height
  const preferredTop = foreground.top - extraY * 0.38
  const preferredLeft = foreground.left + foreground.width / 2 - cropWidth / 2

  return {
    left: clamp(Math.round(preferredLeft), 0, imageWidth - cropWidth),
    top: clamp(Math.round(preferredTop), 0, imageHeight - cropHeight),
    width: cropWidth,
    height: cropHeight,
  }
}

function estimateBackgroundColor(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
): { r: number; g: number; b: number } {
  const sampleSize = Math.max(12, Math.floor(Math.min(width, height) * 0.05))
  const corners = [
    { left: 0, top: 0 },
    { left: width - sampleSize, top: 0 },
    { left: 0, top: height - sampleSize },
    { left: width - sampleSize, top: height - sampleSize },
  ]

  let r = 0
  let g = 0
  let b = 0
  let count = 0

  for (const corner of corners) {
    for (let y = corner.top; y < corner.top + sampleSize; y++) {
      for (let x = corner.left; x < corner.left + sampleSize; x++) {
        const offset = (y * width + x) * channels
        r += data[offset] ?? 255
        g += data[offset + 1] ?? 255
        b += data[offset + 2] ?? 255
        count++
      }
    }
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  }
}

function isForegroundPixel(
  data: Buffer,
  offset: number,
  background: { r: number; g: number; b: number },
): boolean {
  const r = data[offset] ?? 255
  const g = data[offset + 1] ?? 255
  const b = data[offset + 2] ?? 255
  const distance =
    Math.abs(r - background.r) + Math.abs(g - background.g) + Math.abs(b - background.b)
  const saturation = Math.max(r, g, b) - Math.min(r, g, b)
  const darkerThanBackground =
    Math.max(0, background.r - r) + Math.max(0, background.g - g) + Math.max(0, background.b - b)

  return (
    distance >= FOREGROUND_DISTANCE_THRESHOLD ||
    darkerThanBackground >= FOREGROUND_DISTANCE_THRESHOLD ||
    (saturation > 28 && distance > 24)
  )
}

function firstIndexAtLeast(values: Uint32Array, threshold: number): number | null {
  for (let i = 0; i < values.length; i++) {
    if ((values[i] ?? 0) >= threshold) return i
  }
  return null
}

function lastIndexAtLeast(values: Uint32Array, threshold: number): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    if ((values[i] ?? 0) >= threshold) return i
  }
  return null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
