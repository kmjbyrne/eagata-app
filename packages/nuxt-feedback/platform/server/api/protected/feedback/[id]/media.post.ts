/** An image for a platform reply, stored in the feedback's workspace. */
export default defineServiceHandler(async (event) => {
  const { key, src } = await useServices(event).feedback.attachImage(getRouterParam(event, 'id')!, () => readImageUpload(event))
  setResponseStatus(event, 201)
  return { key, src }
})
