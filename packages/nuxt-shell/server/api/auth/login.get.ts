import { NotSignedInError } from '@kmjbyrne/core'
import { loginQuery } from '../../../shared/contracts/auth'

/**
 * Starts a sign-in, or with `intent=connect` a signed-in user's linking of
 * another account. Keeps this round trip's secrets in a short-lived cookie,
 * and redirects to the provider.
 */
export default defineNavigationHandler(async (event) => {
  const { hint, intent } = await getValidatedQuery(event, loginQuery.parse)
  if (intent === 'connect') {
    await useServices(event).users.getMe()
  }
  const redirectUri = useRuntimeConfig().oidc.redirectUri || `${getRequestURL(event).origin}/api/auth/callback`
  const { url, state, nonce, codeVerifier } = await useAdapters().signIn.authorizationRequest({ loginHint: hint, redirectUri })
  await replaceFlow(event, { state, nonce, codeVerifier, redirectUri, intent })
  return sendRedirect(event, url)
}, error => error instanceof NotSignedInError ? '/login' : '/login?error=unavailable')
