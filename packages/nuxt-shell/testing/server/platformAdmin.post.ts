import { parseEmail } from '@kmjbyrne/core'

/** Test only: makes a user who signed up a platform admin. */
export default defineEventHandler(async (event) => {
  const { email } = await readBody<{ email: string }>(event)
  const { repositories } = useAdapters()
  const user = await repositories.users.findByEmail(parseEmail(email))
  await repositories.users.update({ ...user!, isPlatformAdmin: true })
  return null
})
