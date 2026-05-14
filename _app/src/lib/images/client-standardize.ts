'use client'

import imageCompression from 'browser-image-compression'
import {
  buildImageMaxUploadMessage,
  getImageExtension,
  IMAGE_INVALID_FORMAT_MESSAGE,
  IMAGE_MAX_UPLOAD_BYTES,
  IMAGE_STANDARD_MAX_DIMENSION,
  IMAGE_STANDARD_OUTPUT_MIME,
  IMAGE_STANDARD_QUALITY,
  buildStandardizedImageFilename,
  validateImageUploadMeta,
} from './upload'

/**
 * Safari iOS tem suporte instável a Web Workers em alguns contextos:
 * Workers criados via Blob URL podem falhar silenciosamente, e o
 * browser-image-compression usa exatamente esse padrão. Detectamos
 * Safari iOS pelo userAgent e desabilitamos o worker — a compressão
 * roda na main thread, que é estável.
 */
function isSafariIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return isIOS && isSafari
}

export interface StandardizedImage {
  file: File
  previewUrl: string
}

export interface ImageStandardizationOptions {
  maxSizeMB?: number
  maxUploadBytes?: number
  maxWidthOrHeight?: number
}

export async function standardizeImageFile(
  file: File,
  options: ImageStandardizationOptions = {},
): Promise<File> {
  const maxUploadBytes = options.maxUploadBytes ?? IMAGE_MAX_UPLOAD_BYTES
  const maxSizeMB = options.maxSizeMB ?? 2
  const maxWidthOrHeight = options.maxWidthOrHeight ?? IMAGE_STANDARD_MAX_DIMENSION
  const validation = validateImageUploadMeta(
    {
      filename: file.name,
      contentType: file.type,
      size: file.size,
    },
    {
      maxBytes: maxUploadBytes,
    },
  )

  if (!validation.ok) {
    throw new Error(validation.message)
  }

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: !isSafariIOS(),
      initialQuality: IMAGE_STANDARD_QUALITY,
      preserveExif: false,
      fileType: IMAGE_STANDARD_OUTPUT_MIME,
    })

    return new File([compressed], buildStandardizedImageFilename(file.name), {
      type: IMAGE_STANDARD_OUTPUT_MIME,
      lastModified: Date.now(),
    })
  } catch (error) {
    if (typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error('[client-standardize] imageCompression falhou', {
        name: file.name,
        type: file.type,
        size: file.size,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    if (file.size > maxUploadBytes) {
      throw new Error(buildImageMaxUploadMessage(maxUploadBytes))
    }

    const ext = getImageExtension(file.name)
    const isHeic =
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      ext === 'heic' ||
      ext === 'heif'

    throw new Error(
      isHeic
        ? 'Não foi possível preparar esta foto HEIC neste navegador. Tente selecionar a imagem novamente ou envie em JPG, PNG ou WEBP.'
        : IMAGE_INVALID_FORMAT_MESSAGE,
    )
  }
}

export async function preparePreviewableImage(
  file: File,
  options: ImageStandardizationOptions = {},
): Promise<StandardizedImage> {
  const standardized = await standardizeImageFile(file, options)
  return {
    file: standardized,
    previewUrl: URL.createObjectURL(standardized),
  }
}
