import type { User } from '../entities/User'
import { createCoreServices } from '../services/CoreServices'
import { parseEmail } from '../values/Email'
import { FakeCurrentUser } from './FakeCurrentUser'
import { InMemoryRepositories } from './InMemoryRepositories'
import { SequentialIdGenerator } from './SequentialIdGenerator'

/**
 * Every core service on in-memory repositories, for unit tests in core and in
 * apps. Sign people up and switch between them with the helpers:
 *
 *   const t = createTestServices()
 *   const ada = await t.signUp('Ada Lovelace')
 *   t.signInAs(ada)
 */
export function createTestServices() {
  const repositories = new InMemoryRepositories()
  const currentUser = new FakeCurrentUser()
  const ids = new SequentialIdGenerator()
  const services = createCoreServices({ repositories, currentUser, ids })

  /** Signs a new user up as a provider would, with an email made from the name unless given. */
  async function signUp(displayName: string, options: { email?: string, platformAdmin?: boolean } = {}): Promise<User> {
    const email = parseEmail(options.email ?? `${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@example.com`)
    const user = await services.auth.signIn({
      provider: 'test',
      subject: `test|${email}`,
      email,
      emailVerified: true,
      name: displayName,
      picture: null
    })
    if (!options.platformAdmin) {
      return user
    }
    const admin = { ...user, isPlatformAdmin: true }
    await repositories.users.update(admin)
    return admin
  }

  return {
    repositories,
    currentUser,
    ids,
    services,
    signUp,
    signInAs: (user: User) => currentUser.signInAs(user.id),
    signOut: () => currentUser.signOut()
  }
}
