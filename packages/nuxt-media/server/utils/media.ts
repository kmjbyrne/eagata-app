import type { H3Event } from 'h3'
import { MEDIA_MAX_BYTES, type MediaStorage } from '@kmjbyrne/core/media'
import { LocalDiskMediaStorage } from '../adapters/LocalDiskMediaStorage'
// Adds this layer's adapter and service to the shell's types, wherever the layer is used.
import type {} from '../../types'

let defaultStorage: MediaStorage | undefined

/** The provided storage, else local disk under NUXT_MEDIA_DIR. */
export function useMediaStorage(): MediaStorage {
  const provided = useAdapters().mediaStorage
  if (provided) {
    return provided
  }
  defaultStorage ??= new LocalDiskMediaStorage(useRuntimeConfig().mediaDir)
  return defaultStorage
}

/**
 * The image in a multipart upload's `file` field. Pass it to a service as the
 * reader, so the body is read only once the service has checked access.
 *
 * A body must declare its length, and fit. HTTP/1.1 holds a body to its
 * `Content-Length`, so h3, which buffers whatever it's sent, never takes in
 * more. A chunked body declares nothing, so it could run on without end.
 */
export async function readImageUpload(event: H3Event): Promise<Uint8Array> {
  const length = getRequestHeader(event, 'content-length')
  if (length === undefined) {
    throw createError({ statusCode: 411, message: 'Send the image with a Content-Length' })
  }
  // Room is left for the multipart framing around the file.
  if (Number(length) > MEDIA_MAX_BYTES + 64 * 1024) {
    throw createError({ statusCode: 413, message: 'Images must be 15 MB or smaller' })
  }
  const file = (await readMultipartFormData(event))?.find(part => part.name === 'file')
  if (!file) {
    throw createError({ statusCode: 400, message: 'Send the image as a `file` field' })
  }
  return new Uint8Array(file.data)
}
