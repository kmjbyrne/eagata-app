/** Ends every session the signed-in user has, this one included. */
export default defineServiceHandler(async (event) => {
  await useServices(event).users.signOutEverywhere()
  await endSession(event)
  setResponseStatus(event, 204)
  return null
})
