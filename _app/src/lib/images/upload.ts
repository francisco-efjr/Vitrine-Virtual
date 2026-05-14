export const IMAGE_ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
] as const

export const IMAGE_ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'] as const

const IMAGE_AMBIGUOUS_MIME_TYPES = ['', 'application/octet-stream'] as const

export const IMAGE_INVALID_FORMAT_MESSAGE =
  'Formato de imagem inválido. Envie uma foto em JPG, JPEG, PNG, HEIC ou WEBP.'

export const IMAGE_MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const IMAGE_TRY_ON_CUSTOMER_MAX_UPLOAD_BYTES = 60 * 1024 * 1024
export const IMAGE_STANDARD_OUTPUT_MIME = 'image/webp'
export const IMAGE_STANDARD_OUTPUT_EXTENSION = 'webp'
export const IMAGE_STANDARD_QUALITY = 0.88
export const IMAGE_STANDARD_MAX_DIMENSION = 1600
export const IMAGE_TRY_ON_CUSTOMER_STANDARD_MAX_DIMENSION = 3840
export const IMAGE_TRY_ON_CUSTOMER_STANDARD_MAX_SIZE_MB = 60

export interface ImageUploadMeta {
  filename: string
  contentType: string
  size: number
}

export interface ImageUploadValidationOptions {
  maxBytes?: number
}

export function sanitizeImageFilename(filename: string): string {
  const trimmed = filename
    .trim()
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
  const normalized = trimmed
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'imagem'
}

export function getImageExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return ext
}

export function isAcceptedImageMime(contentType: string): boolean {
  return (IMAGE_ACCEPTED_MIME_TYPES as readonly string[]).includes(contentType.toLowerCase())
}

export function isAmbiguousImageMime(contentType: string): boolean {
  return (IMAGE_AMBIGUOUS_MIME_TYPES as readonly string[]).includes(contentType.toLowerCase())
}

export function isAcceptedImageExtension(filename: string): boolean {
  const ext = getImageExtension(filename)
  return (IMAGE_ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)
}

export function isSafeImageFilename(filename: string): boolean {
  return !/[<>:"/\\|?*\u0000-\u001F]/.test(filename)
}

export function buildImageMaxUploadMessage(maxBytes: number = IMAGE_MAX_UPLOAD_BYTES): string {
  return `A imagem deve ter no máximo ${Math.round(maxBytes / 1024 / 1024)} MB.`
}

/**
 * Regra:
 * - extensão DEVE estar na whitelist (defesa contra arquivos disfarçados);
 * - MIME pode estar na whitelist OU ser ambíguo (vazio/octet-stream) —
 *   iOS Safari e alguns Androids mandam HEIC com MIME vazio ou genérico,
 *   então confiamos na extensão nesses casos. MIME explicitamente diferente
 *   (ex: 'image/svg+xml', 'application/pdf') continua sendo rejeitado.
 */
export function validateImageUploadMeta(
  meta: ImageUploadMeta,
  options: ImageUploadValidationOptions = {},
): { ok: true } | { ok: false; message: string } {
  const maxBytes = options.maxBytes ?? IMAGE_MAX_UPLOAD_BYTES

  if (!isAcceptedImageExtension(meta.filename)) {
    return { ok: false, message: IMAGE_INVALID_FORMAT_MESSAGE }
  }

  if (!isAcceptedImageMime(meta.contentType) && !isAmbiguousImageMime(meta.contentType)) {
    return { ok: false, message: IMAGE_INVALID_FORMAT_MESSAGE }
  }

  if (!isSafeImageFilename(meta.filename)) {
    return { ok: false, message: IMAGE_INVALID_FORMAT_MESSAGE }
  }

  if (meta.size <= 0 || meta.size > maxBytes) {
    return { ok: false, message: buildImageMaxUploadMessage(maxBytes) }
  }

  return { ok: true }
}

export function buildStandardizedImageFilename(filename: string): string {
  return `${sanitizeImageFilename(filename)}.${IMAGE_STANDARD_OUTPUT_EXTENSION}`
}
