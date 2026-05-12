'use client'

import imageCompression from 'browser-image-compression'
import {
  buildImageMaxUploadMessage,
  IMAGE_INVALID_FORMAT_MESSAGE,
  IMAGE_MAX_UPLOAD_BYTES,
  IMAGE_STANDARD_MAX_DIMENSION,
  IMAGE_STANDARD_OUTPUT_MIME,
  IMAGE_STANDARD_QUALITY,
  buildStandardizedImageFilename,
  validateImageUploadMeta,
} from './upload'

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
      useWebWorker: true,
      initialQuality: IMAGE_STANDARD_QUALITY,
      preserveExif: false,
      fileType: IMAGE_STANDARD_OUTPUT_MIME,
    })

    return new File([compressed], buildStandardizedImageFilename(file.name), {
      type: IMAGE_STANDARD_OUTPUT_MIME,
      lastModified: Date.now(),
    })
  } catch {
    if (file.size > maxUploadBytes) {
      throw new Error(buildImageMaxUploadMessage(maxUploadBytes))
    }

    throw new Error(
      file.type === 'image/heic' || file.type === 'image/heif'
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
