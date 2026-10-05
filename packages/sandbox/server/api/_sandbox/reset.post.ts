/** Puts every collection back to its fixtures. */
export default defineSandboxHandler(async (event) => {
  await useSandbox().store.reset()
  setResponseStatus(event, 204)
  return null
})
