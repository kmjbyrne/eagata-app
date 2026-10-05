export default defineServiceHandler(async (event) => {
  await endSession(event)
  setResponseStatus(event, 204)
  return null
})
