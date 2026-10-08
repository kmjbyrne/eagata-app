import { TooManyAttemptsError } from '@kmjbyrne/core'
import { inviteBody, type InvitationResponse } from '../../../../../../../shared/contracts/workspaces'

/** Invitations per person an hour, to slow anyone scripting through emails. */
const INVITES = { limit: 50, windowMs: 60 * 60 * 1000 }

/** Invites someone by email. Answers the same whether or not the email has an account. */
export default defineServiceHandler(async (event): Promise<InvitationResponse> => {
  const { email, role } = await readValidatedBody(event, inviteBody.parse)
  const wait = await useAdapters().rateLimiter.consume(`invite:${event.context.actor?.id ?? 'anonymous'}`, INVITES)
  if (wait > 0) {
    throw new TooManyAttemptsError(wait)
  }
  const invitation = await useServices(event).workspaces.invite(getRouterParam(event, 'org')!, getRouterParam(event, 'workspace')!, email, role)
  setResponseStatus(event, 201)
  return toInvitation(invitation)
})
