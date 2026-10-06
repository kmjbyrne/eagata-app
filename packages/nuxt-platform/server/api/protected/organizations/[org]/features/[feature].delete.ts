export default defineServiceHandler(async (event) => {
  await useServices(event).platformOrgs.disableFeature(getRouterParam(event, 'org')!, getRouterParam(event, 'feature')!)
  setResponseStatus(event, 204)
})
