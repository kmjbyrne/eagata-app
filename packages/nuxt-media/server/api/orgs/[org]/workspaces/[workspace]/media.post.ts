import type { StoredMediaResponse } from '../../../../../../shared/contracts/media'

/** Uploads one image, as multipart form data with a `file` field. */
export default defineServiceHandler(async (event): Promise<StoredMediaResponse> => {
  const { key, src } = await useServices(event).media.upload(getRouterParam(event, 'org')!, getRouterParam(event, 'workspace')!, () => readImageUpload(event))
  setResponseStatus(event, 201)
  return { key, src }
})
