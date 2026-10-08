import type { StoredMediaResponse } from '../../../shared/contracts/media'

/** Uploads one image of the signed-in user's own, as multipart form data with a `file` field. */
export default defineServiceHandler(async (event): Promise<StoredMediaResponse> => {
  const { key, src } = await useServices(event).media.uploadForMe(() => readImageUpload(event))
  setResponseStatus(event, 201)
  return { key, src }
})
