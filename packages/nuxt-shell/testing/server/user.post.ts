import { parseEmail } from '@kmjbyrne/core'
import { provisionUser } from '@kmjbyrne/core/testing'

/** Test only: sets up a user with their personal org, as a platform admin would. Registration is closed, so sign-in needs one. */
export default defineEventHandler(async (event) => {
  const { email, name } = await readBody<{ email: string, name?: string }>(event)
  const { repositories, ids } = useAdapters()
  const user = await repositories.transaction(tx => provisionUser(tx, ids, { displayName: name ?? email.split('@')[0]!, email: parseEmail(email) }))
  return { id: user.id }
})
