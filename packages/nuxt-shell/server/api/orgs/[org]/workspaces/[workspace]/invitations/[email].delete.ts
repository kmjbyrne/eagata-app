/** Withdraws an invitation. */
export default defineServiceHandler(async (event) => {
  await useServices(event).workspaces.cancelInvitation(getRouterParam(event, 'org')!, getRouterParam(event, 'workspace')!, decodeURIComponent(getRouterParam(event, 'email')!))
  setResponseStatus(event, 204)
  return null
})
