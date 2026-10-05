/**
 * Serves an image to someone who can see its workspace. Keys never change, so
 * the browser keeps it, privately, and the access check runs once per image.
 */
export default defineServiceHandler(async (event) => {
  const { bytes, contentType } = await useServices(event).media.read(getRouterParam(event, 'key') ?? '')
  setResponseHeaders(event, {
    'content-type': contentType,
    'cache-control': 'private, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    'content-security-policy': 'default-src \'none\''
  })
  return bytes
})
