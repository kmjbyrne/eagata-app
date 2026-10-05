import { loginQuery } from '../../../shared/contracts/auth'

/** Starts a sign-in: keeps this round trip's secrets in a short-lived cookie and redirects to the provider. */
export default defineServiceHandler(async (event) => {
  const { hint } = await getValidatedQuery(event, loginQuery.parse)
  const { url, state, nonce, codeVerifier } = await useAdapters().signIn.authorizationRequest({ loginHint: hint })
  await replaceFlow(event, { state, nonce, codeVerifier })
  return sendRedirect(event, url)
})
