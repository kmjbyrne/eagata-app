import type { PendingLinkResponse } from '../../../shared/contracts/passwords'

/** The account waiting for its password to link, for the link page. */
export default defineServiceHandler(async (event): Promise<PendingLinkResponse> => {
  const { pendingLink } = await readFlow(event)
  if (!pendingLink) {
    throw createError({ statusCode: 404, message: 'No sign-in is waiting to be linked' })
  }
  return { email: pendingLink.email, provider: pendingLink.identity.provider }
})
