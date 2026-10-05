import { MEDIA_MAX_BYTES } from '@kmjbyrne/core/media'

/** An image for a platform reply, stored in the feedback's workspace. */
export default defineServiceHandler(async (event) => {
  if (Number(getRequestHeader(event, 'content-length') ?? 0) > MEDIA_MAX_BYTES + 64 * 1024) {
    throw createError({ statusCode: 413, message: 'Images must be 15 MB or smaller' })
  }
  const file = (await readMultipartFormData(event))?.find(part => part.name === 'file')
  if (!file) {
    throw createError({ statusCode: 400, message: 'Send the image as a `file` field' })
  }
  const { key, src } = await useServices(event).feedback.attachImage(getRouterParam(event, 'id')!, new Uint8Array(file.data))
  setResponseStatus(event, 201)
  return { key, src }
})
