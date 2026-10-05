import { AccountDeactivatedError, EmailNotVerifiedError, IdentityMismatchError, NotInvitedError, type ProviderIdentity } from '@kmjbyrne/core'
import { callbackQuery, type SignInError } from '../../../shared/contracts/auth'

const backToLogin = (error: SignInError) => `/login?error=${error}`

/**
 * Finishes a sign-in. The state must match the one this browser started
 * with, or the request was forged or replayed.
 */
export default defineServiceHandler(async (event) => {
  const query = await getValidatedQuery(event, callbackQuery.parse)
  const flow = await readFlow(event)
  await endFlow(event)

  if (query.error) {
    return sendRedirect(event, backToLogin('cancelled'))
  }
  if (!query.code || !query.state || !flow.state || !flow.nonce || !flow.codeVerifier || !flow.redirectUri || query.state !== flow.state) {
    throw createError({ statusCode: 400, message: 'This sign-in has expired or did not start here. Start again.' })
  }

  let identity: ProviderIdentity
  try {
    identity = await useAdapters().signIn.complete(query.code, { nonce: flow.nonce, codeVerifier: flow.codeVerifier, redirectUri: flow.redirectUri })
  } catch (error) {
    console.error('[auth] The provider sign-in failed', error)
    return sendRedirect(event, backToLogin('provider'))
  }

  try {
    const result = await useServices(event).auth.signIn(identity)
    if (result.kind === 'link-required') {
      throw createError({ statusCode: 501, message: 'Linking this account needs proof this app has no way to ask for' })
    }
    await startSession(event, result.user.id)
  } catch (error) {
    if (error instanceof EmailNotVerifiedError) {
      return sendRedirect(event, backToLogin('email-not-verified'))
    }
    if (error instanceof NotInvitedError) {
      return sendRedirect(event, backToLogin('not-invited'))
    }
    if (error instanceof AccountDeactivatedError) {
      return sendRedirect(event, backToLogin('deactivated'))
    }
    if (error instanceof IdentityMismatchError) {
      return sendRedirect(event, backToLogin('identity-mismatch'))
    }
    throw error
  }
  return sendRedirect(event, '/')
})
