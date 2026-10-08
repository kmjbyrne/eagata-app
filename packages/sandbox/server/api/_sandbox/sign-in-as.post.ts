import { isActive, parseEmail } from '@kmjbyrne/core'
import { z } from 'zod'

const body = z.object({ email: z.string() })

/**
 * Becomes a dev user at once, as "Sign in as" does: no provider, so no
 * account linking or password. "Continue with Google" runs the real flow, with
 * the stand-in's consent screen, for trying those.
 */
export default defineSandboxHandler(async (event) => {
  const { email } = await readValidatedBody(event, body.parse)
  const user = await useAdapters().repositories.users.findByEmail(parseEmail(email))
  if (!user) {
    throw createError({ statusCode: 404, message: 'No dev user has that email' })
  }
  if (!isActive(user)) {
    throw createError({ statusCode: 403, message: 'Deactivated', data: { error: 'AccountDeactivatedError' } })
  }
  await startSession(event, user)
  setResponseStatus(event, 204)
  return null
})
