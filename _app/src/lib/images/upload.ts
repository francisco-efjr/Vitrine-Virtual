export const IMAGE_ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
] as const

export const IMAGE_ACCEPTED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'avif',
  'heic',
  'heif',
] as const

const IMAGE_AMBIGUOUS_MIME_TYPES = ['', 'application/octet-stream'] as const

/**
 * Formatos RAW (DNG, CR2, NEF, ARW, etc.) que celulares modernos podem
 * gerar em modo Pro/ProRAW. Browsers não decodificam RAW em Canvas, então
 * o client-standardize falha e nenhum provider de try-on aceita esses
 * arquivos. Detectamos esses casos pra mostrar mensagem específica em vez
 * do erro genérico de "formato inválido".
 */
export const IMAGE_RAW_EXTENSIONS = [
  'dng',
  'cr2',
  'cr3',
  'nef',
  'nrw',
  'arw',
  'srf',
  'sr2',
  'orf',
  'raf',
  'rw2',
  'pef',
  'rwl',
  'iiq',
  '3fr',
  'fff',
  'dcr',
  'kdc',
  'mrw',
  'x3f',
  'erf',
  'mef',
  'mos',
  'raw',
] as const

const IMAGE_RAW_MIME_TYPES = [
  'image/x-adobe-dng',
  'image/dng',
  'image/x-dng',
  'image/x-canon-cr2',
  'image/x-canon-cr3',
  'image/x-nikon-nef',
  'image/x-nikon-nrw',
  'image/x-sony-arw',
  'image/x-sony-sr2',
  'image/x-olympus-orf',
  'image/x-fuji-raf',
  'image/x-panasonic-rw2',
  'image/raw',
  'image/x-raw',
] as const

export const IMAGE_INVALID_FORMAT_MESSAGE =
  'Formato de imagem inválido. Envie uma foto em JPG, JPEG, PNG, WEBP, AVIF ou HEIC.'

export const IMAGE_RAW_FORMAT_MESSAGE =
  'Esta foto está em formato RAW (como DNG, CR2 ou NEF) e não pode ser processada pelo provador. ' +
  'Desative o modo ProRAW/Pro nas configurações da câmera, ou exporte a foto como JPEG/HEIC antes de enviar.'

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

export function isRawImageFormat(meta: { filename: string; contentType: string }): boolean {
  const ext = getImageExtension(meta.filename)
  if ((IMAGE_RAW_EXTENSIONS as readonly string[]).includes(ext)) return true
  return (IMAGE_RAW_MIME_TYPES as readonly string[]).includes(meta.contentType.toLowerCase())
}

export function isSafeImageFilename(filename: string): boolean {
  return !/[<>:"/\\|?*\u0000-\u001F]/.test(filename)
}

export function buildImageMaxUploadMessage(maxBytes: number = IMAGE_MAX_UPLOAD_BYTES): string {
  return `A imagem deve ter no máximo ${Math.round(maxBytes / 1024 / 1024)} MB.`
}

/**
 * Regra:
 * - se o arquivo for RAW (DNG/CR2/NEF/etc.), retorna mensagem específica
 *   antes da validação genérica — o usuário precisa saber que é o modo
 *   ProRAW/Pro da câmera que precisa ser desligado;
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

  if (isRawImageFormat(meta)) {
    return { ok: false, message: IMAGE_RAW_FORMAT_MESSAGE }
  }

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
