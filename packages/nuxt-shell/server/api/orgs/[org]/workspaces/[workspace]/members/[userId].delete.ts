import { parseUserId } from '@kmjbyrne/core'

/** Owners remove anyone. A member removes themselves to leave. */
export default defineServiceHandler(async (event) => {
  await useServices(event).workspaces.removeMember(
    getRouterParam(event, 'org')!,
    getRouterParam(event, 'workspace')!,
    parseUserId(getRouterParam(event, 'userId')!)
  )
  setResponseStatus(event, 204)
  return null
})
