import type { User } from '../entities/User'
import type { IdGenerator } from '../ports/IdGenerator'
import type { Repositories } from '../ports/Repositories'
import { parseEmail } from '../values/Email'
import { provisionUser } from './provisionUser'

/**
 * Makes someone a platform admin, creating them with their personal org if
 * they don't exist. For a fresh install, where registration is closed and no
 * platform admin exists to create anyone. It checks no permission, so call it
 * only from tools that already need direct access to the database.
 */
export function bootstrapPlatformAdmin(repositories: Repositories, ids: IdGenerator, input: { email: string, displayName?: string }): Promise<{ user: User, created: boolean }> {
  const email = parseEmail(input.email)
  return repositories.transaction(async (tx) => {
    const existing = await tx.users.findByEmail(email)
    if (existing) {
      const user = { ...existing, isPlatformAdmin: true, deactivatedAt: null }
      await tx.users.update(user)
      return { user, created: false }
    }
    const user = await provisionUser(tx, ids, { displayName: input.displayName ?? email.split('@')[0]!, email, isPlatformAdmin: true })
    return { user, created: true }
  })
}
