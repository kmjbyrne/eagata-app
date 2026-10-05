import { parseUserId } from '@kmjbyrne/core'

export default defineServiceHandler(async (event) => {
  await useServices(event).platformOrgs.removeMember(getRouterParam(event, 'org')!, parseUserId(getRouterParam(event, 'userId')!))
  setResponseStatus(event, 204)
  return null
})
