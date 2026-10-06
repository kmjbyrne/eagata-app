/** Switches a feature flag on for the org. Already on, it stays as it was. */
export default defineServiceHandler(async (event) => {
  await useServices(event).platformOrgs.enableFeature(getRouterParam(event, 'org')!, getRouterParam(event, 'feature')!)
  setResponseStatus(event, 204)
})
