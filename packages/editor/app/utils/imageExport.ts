const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  // Canvas can't write GIF, and an edit would lose the animation anyway.
  gif: 'image/png'
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
}

/** Longest edge of an edited image, so phone photos don't upload at full size. */
export const EDITED_IMAGE_MAX_EDGE = 2000

function extensionOf(src: string): string {
  const path = src.split(/[?#]/)[0] ?? ''
  const dot = path.lastIndexOf('.')
  return dot === -1 ? '' : path.slice(dot + 1).toLowerCase()
}

/**
 * The file an edited image is saved as: the source's own type where a canvas
 * can write it, else JPEG, named after the source with an -edited suffix.
 */
export function editedImageFile(src: string, sourceType = ''): { name: string, type: string, quality: number | undefined } {
  const type = (sourceType in EXTENSIONS ? sourceType : TYPES[extensionOf(src)]) ?? 'image/jpeg'
  const path = src.startsWith('blob:') ? 'image' : (src.split(/[?#]/)[0] ?? '')
  const base = path.slice(path.lastIndexOf('/') + 1).replace(/\.[^.]*$/, '') || 'image'
  return {
    name: `${base.replace(/-edited$/, '')}-edited.${EXTENSIONS[type]}`,
    type,
    quality: type === 'image/png' ? undefined : 0.85
  }
}

/**
 * The URL to load an image from for editing. A cross-origin image the page
 * already showed is cached without CORS headers, which taints the canvas, so
 * bust the cache for those. Same-origin, blob and data URLs load as they are.
 */
export function editableImageSrc(src: string, pageOrigin: string, nonce: string): string {
  if (!/^https?:/i.test(src) || new URL(src).origin === pageOrigin) {
    return src
  }
  const url = new URL(src)
  url.searchParams.set('edit', nonce)
  return url.toString()
}
