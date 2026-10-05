import type { User } from '../entities/User'
import type { LinkProof } from '../ports/LinkProof'
import { createCoreServices } from '../services/CoreServices'
import { provisionUser } from '../services/provisionUser'
import { parseEmail } from '../values/Email'
import { FakeCurrentUser } from './FakeCurrentUser'
import { InMemoryRepositories } from './InMemoryRepositories'
import { SequentialIdGenerator } from './SequentialIdGenerator'

/**
 * Every core service on in-memory repositories, for unit tests in core and in
 * apps. Add people and switch between them with the helpers:
 *
 *   const t = createTestServices()
 *   const ada = await t.addUser('Ada Lovelace')
 *   t.signInAs(ada)
 */
export function createTestServices(options: { linkProof?: LinkProof } = {}) {
  const repositories = new InMemoryRepositories()
  const currentUser = new FakeCurrentUser()
  const ids = new SequentialIdGenerator()
  const services = createCoreServices({ repositories, currentUser, ids, linkProof: options.linkProof })

  /**
   * Adds a user, with their personal org, as a platform admin would. The email
   * is made from the name unless given.
   */
  async function addUser(displayName: string, options: { email?: string, platformAdmin?: boolean } = {}): Promise<User> {
    const email = parseEmail(options.email ?? `${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@example.com`)
    return repositories.transaction(tx => provisionUser(tx, ids, { displayName, email, isPlatformAdmin: options.platformAdmin }))
  }

  return {
    repositories,
    currentUser,
    ids,
    services,
    addUser,
    signInAs: (user: User) => currentUser.signInAs(user.id),
    signOut: () => currentUser.signOut()
  }
}
