import { parseUserId } from '@kmjbyrne/core'

/** A platform admin emails a user a link to choose their password. */
export default defineServiceHandler(async (event) => {
  await useServices(event).passwords.sendInvite(parseUserId(getRouterParam(event, 'id')!), setPasswordUrl(event))
  setResponseStatus(event, 202)
  return null
})
