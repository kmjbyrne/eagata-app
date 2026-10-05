import { decideConsent, renderConsent, type ConsentQuery } from '../../../oidc/consent'

/** The sandbox's stand-in for a provider's consent screen. */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  const decision = decideConsent(getQuery<ConsentQuery>(event), await useSandbox().devUsers(), getRequestURL(event).origin)
  if (decision.kind === 'invalid') {
    throw createError({ statusCode: 400, message: decision.message })
  }
  if (decision.kind === 'redirect') {
    return sendRedirect(event, decision.location)
  }
  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  return renderConsent(decision)
})
