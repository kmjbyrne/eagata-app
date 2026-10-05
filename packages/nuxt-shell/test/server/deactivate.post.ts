import { parseEmail } from '@kmjbyrne/core'

/** Test only: deactivates a user, as a platform admin would. */
export default defineEventHandler(async (event) => {
  const { email } = await readBody<{ email: string }>(event)
  const { repositories } = useAdapters()
  const user = await repositories.users.findByEmail(parseEmail(email))
  await repositories.users.update({ ...user!, deactivatedAt: new Date() })
  return null
})
