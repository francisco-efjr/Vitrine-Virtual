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
