import { parseEmail } from '@kmjbyrne/core'

/** Gives a user a password directly, as if they had set it. */
export default defineEventHandler(async (event) => {
  const { email, password } = await readBody<{ email: string, password: string }>(event)
  const user = await useAdapters().repositories.users.findByEmail(parseEmail(email))
  await usePasswordRepository().setHash(user!.id, `plain:${password}`, new Date())
  return null
})
