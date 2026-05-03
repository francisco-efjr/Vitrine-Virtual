'use client'

import imageCompression from 'browser-image-compression'
import {
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

export async function standardizeImageFile(file: File): Promise<File> {
  const validation = validateImageUploadMeta({
    filename: file.name,
    contentType: file.type,
    size: file.size,
  })

  if (!validation.ok) {
    throw new Error(validation.message)
  }

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: IMAGE_STANDARD_MAX_DIMENSION,
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
    if (file.size > IMAGE_MAX_UPLOAD_BYTES) {
      throw new Error('A imagem deve ter no máximo 10 MB.')
    }

    throw new Error(
      file.type === 'image/heic' || file.type === 'image/heif'
        ? 'Não foi possível preparar esta foto HEIC neste navegador. Tente selecionar a imagem novamente ou envie em JPG, PNG ou WEBP.'
        : IMAGE_INVALID_FORMAT_MESSAGE,
    )
  }
}

export async function preparePreviewableImage(file: File): Promise<StandardizedImage> {
  const standardized = await standardizeImageFile(file)
  return {
    file: standardized,
    previewUrl: URL.createObjectURL(standardized),
  }
}
