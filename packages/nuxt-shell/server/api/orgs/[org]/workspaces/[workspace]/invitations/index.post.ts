import { TooManyAttemptsError } from '@kmjbyrne/core'
import { inviteBody, type InvitationResponse } from '../../../../../../../shared/contracts/workspaces'

/** Invitations per person an hour, to slow anyone scripting through emails. */
const INVITES = { limit: 50, windowMs: 60 * 60 * 1000 }

/** Invites someone by email. Answers the same whether or not the email has an account. */
export default defineServiceHandler(async (event): Promise<InvitationResponse> => {
  const { email, role } = await readValidatedBody(event, inviteBody.parse)
  const { rateLimiter } = useAdapters()
  const key = `invite:${event.context.actor?.id ?? 'anonymous'}`
  const wait = await rateLimiter.retryAfter(key, INVITES)
  if (wait > 0) {
    throw new TooManyAttemptsError(wait)
  }
  const invitation = await useServices(event).workspaces.invite(getRouterParam(event, 'org')!, getRouterParam(event, 'workspace')!, email, role)
  await rateLimiter.hit(key, INVITES)
  setResponseStatus(event, 201)
  return toInvitation(invitation)
})
