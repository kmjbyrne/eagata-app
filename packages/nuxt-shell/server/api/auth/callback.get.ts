import { AccountDeactivatedError, EmailNotVerifiedError, IdentityInUseError, IdentityMismatchError, NotInvitedError, type ProviderIdentity } from '@kmjbyrne/core'
import type { H3Event } from 'h3'
import { callbackQuery, type ConnectOutcome, type SignInError } from '../../../shared/contracts/auth'

const backToLogin = (error: SignInError) => `/login?error=${error}`
const backToSecurity = (outcome: ConnectOutcome) => `/settings/security?connect=${outcome}`

/**
 * Links the account to the signed-in user, and returns to their settings.
 * Linking signs the user out everywhere, so this browser gets a new session.
 */
async function connect(event: H3Event, identity: ProviderIdentity) {
  try {
    await startSession(event, await useServices(event).auth.connectIdentity(identity))
    return sendRedirect(event, backToSecurity('connected'))
  } catch (error) {
    if (error instanceof IdentityInUseError) {
      return sendRedirect(event, backToSecurity('in-use'))
    }
    if (error instanceof IdentityMismatchError) {
      return sendRedirect(event, backToSecurity('mismatch'))
    }
    throw error
  }
}

/**
 * Finishes a sign-in. The state must match the one this browser started
 * with, or the request was forged or replayed.
 */
export default defineNavigationHandler(async (event) => {
  // The query holds the provider's one-time code and our state: keep them out of the log.
  event.context.log?.set({ path: event.path.split('?')[0] })
  const query = await getValidatedQuery(event, callbackQuery.parse)
  const flow = await readFlow(event)
  await endFlow(event)

  const connecting = flow.intent === 'connect'
  if (query.error) {
    return sendRedirect(event, connecting ? backToSecurity('cancelled') : backToLogin('cancelled'))
  }
  if (!query.code || !query.state || !flow.state || !flow.nonce || !flow.codeVerifier || !flow.redirectUri || query.state !== flow.state) {
    // A refresh or Back replays a used callback, and a stale tab sends one
    // that expired. Someone already signed in carries on; anyone else starts again.
    event.context.log?.setLevel('warn')
    const { userId } = await readSession(event)
    return sendRedirect(event, userId ? '/' : backToLogin('expired'))
  }

  let identity: ProviderIdentity
  try {
    identity = await useAdapters().signIn.complete(query.code, { nonce: flow.nonce, codeVerifier: flow.codeVerifier, redirectUri: flow.redirectUri })
  } catch (error) {
    console.error('[auth] The provider sign-in failed', error)
    return sendRedirect(event, connecting ? backToSecurity('provider') : backToLogin('provider'))
  }
  if (connecting) {
    return connect(event, identity)
  }

  try {
    const result = await useServices(event).auth.signIn(identity)
    if (result.kind === 'link-required') {
      // Only a layer that supplies a LinkProof, such as passwords, asks for
      // proof, and that layer provides this page.
      await replaceFlow(event, { pendingLink: result.link })
      return sendRedirect(event, '/link-account')
    }
    await startSession(event, result.user)
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
}, () => backToLogin('unavailable'))
