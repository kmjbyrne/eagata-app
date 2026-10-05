import type { MediaExtension } from './MediaKey'

export interface ImageType {
  extension: MediaExtension
  contentType: string
}

const TYPES: Record<MediaExtension, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp'
}

export function contentTypeFor(extension: MediaExtension): string {
  return TYPES[extension]
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte)
}

/**
 * The image type from the file's own bytes, never its name or the type the
 * browser claimed, so nothing but a real image is stored and served as one.
 */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  let extension: MediaExtension | null = null
  if (startsWith(bytes, [0xFF, 0xD8, 0xFF])) {
    extension = 'jpg'
  } else if (startsWith(bytes, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
    extension = 'png'
  } else if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) {
    extension = 'gif'
  } else if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    extension = 'webp'
  }
  return extension ? { extension, contentType: TYPES[extension] } : null
}
