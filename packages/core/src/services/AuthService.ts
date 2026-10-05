import type { ProviderIdentity, User } from '../entities/User'
import { EmailNotVerifiedError, IdentityMismatchError } from '../errors'
import type { IdGenerator } from '../ports/IdGenerator'
import type { Repositories } from '../ports/Repositories'
import { provisionUser } from './provisionUser'

export class AuthService {
  constructor(
    private readonly repositories: Repositories,
    private readonly ids: IdGenerator
  ) {}

  /**
   * Finds or creates the user for an identity a provider asserted:
   *
   * 1. A user with this identity signs in, whatever the email now says.
   * 2. Otherwise a verified email that matches a user links the identity to them.
   * 3. Otherwise a verified email signs up: a new user with a personal org.
   *
   * An unverified email never links or signs up.
   * @throws EmailNotVerifiedError
   * @throws IdentityMismatchError
   */
  signIn(identity: ProviderIdentity): Promise<User> {
    return this.repositories.transaction(async (tx) => {
      const known = await tx.users.findByIdentity(identity)
      if (known) {
        return this.refreshAvatar(tx, known, identity)
      }
      if (!identity.emailVerified) {
        throw new EmailNotVerifiedError(identity.email)
      }

      const byEmail = await tx.users.findByEmail(identity.email)
      if (byEmail?.identities.some(own => own.provider === identity.provider)) {
        throw new IdentityMismatchError(identity.provider)
      }
      const user = byEmail ?? await provisionUser(tx, this.ids, {
        displayName: identity.name ?? identity.email.split('@')[0]!,
        email: identity.email
      })
      const link = { provider: identity.provider, subject: identity.subject }
      await tx.users.linkIdentity(user.id, link)
      return this.refreshAvatar(tx, { ...user, identities: [...user.identities, link] }, identity)
    })
  }

  private async refreshAvatar(tx: Repositories, user: User, identity: ProviderIdentity): Promise<User> {
    if (user.avatarUrl === identity.picture) {
      return user
    }
    const updated = { ...user, avatarUrl: identity.picture }
    await tx.users.update(updated)
    return updated
  }
}
