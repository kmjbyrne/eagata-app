import { loginQuery } from '../../../shared/contracts/auth'

/** Starts a sign-in: keeps this round trip's secrets in a short-lived cookie and redirects to the provider. */
export default defineServiceHandler(async (event) => {
  const { hint } = await getValidatedQuery(event, loginQuery.parse)
  const redirectUri = useRuntimeConfig().oidc.redirectUri || `${getRequestURL(event).origin}/api/auth/callback`
  const { url, state, nonce, codeVerifier } = await useAdapters().signIn.authorizationRequest({ loginHint: hint, redirectUri })
  await replaceFlow(event, { state, nonce, codeVerifier, redirectUri })
  return sendRedirect(event, url)
})
