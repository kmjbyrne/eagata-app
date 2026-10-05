/** When the store was seeded, and any drifted collections. Null while the app's data is elsewhere. */
export default defineSandboxHandler(async () => {
  const sandbox = useSandbox()
  return sandbox.data ? sandbox.store.status() : null
})
