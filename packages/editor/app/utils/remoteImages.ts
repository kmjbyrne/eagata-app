const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp'
}

/**
 * Pasted images that must be copied into the site's storage before saving:
 * images embedded as base64, which Google Docs and others put on the
 * clipboard, and images still hosted by Google Docs.
 */
export function needsCopying(src: unknown): src is string {
  return isEmbeddedImage(src) || isGoogleDocsImage(src)
}

export function isEmbeddedImage(src: unknown): src is string {
  return typeof src === 'string' && /^data:image\//i.test(src)
}

export function isGoogleDocsImage(src: unknown): src is string {
  if (typeof src !== 'string') {
    return false
  }
  try {
    const url = new URL(src)
    return url.protocol === 'https:' && url.hostname.endsWith('.googleusercontent.com')
  } catch {
    return false
  }
}

/** A readable file name for a copied image: Google's image keys are opaque. */
export function pastedImageName(index: number, type: string): string {
  return `pasted-image-${index + 1}.${EXTENSIONS[type] ?? 'jpg'}`
}
