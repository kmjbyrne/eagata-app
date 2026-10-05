import { MEDIA_MAX_BYTES } from '@kmjbyrne/core/media'
import type { StoredMediaResponse } from '../../../../../../shared/contracts/media'

/** Uploads one image, as multipart form data with a `file` field. */
export default defineServiceHandler(async (event): Promise<StoredMediaResponse> => {
  // Refused before reading, so a huge body is never buffered. Room is left for the multipart framing.
  if (Number(getRequestHeader(event, 'content-length') ?? 0) > MEDIA_MAX_BYTES + 64 * 1024) {
    throw createError({ statusCode: 413, message: 'Images must be 15 MB or smaller' })
  }
  const file = (await readMultipartFormData(event))?.find(part => part.name === 'file')
  if (!file) {
    throw createError({ statusCode: 400, message: 'Send the image as a `file` field' })
  }
  const { key, src } = await useServices(event).media.upload(getRouterParam(event, 'org')!, getRouterParam(event, 'workspace')!, new Uint8Array(file.data))
  setResponseStatus(event, 201)
  return { key, src }
})
