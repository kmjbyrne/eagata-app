import { parseUserId } from '@kmjbyrne/core'
import { inviteBody } from '../../../../shared/contracts/passwords'

/** A platform admin emails a user a link to choose their password. The service refuses anyone else. */
export default defineServiceHandler(async (event) => {
  const { userId } = await readValidatedBody(event, inviteBody.parse)
  await useServices(event).passwords.sendInvite(parseUserId(userId), setPasswordUrl(event))
  setResponseStatus(event, 202)
  return null
})
