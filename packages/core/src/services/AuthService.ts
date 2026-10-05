import type { ProviderIdentity, User } from '../entities/User'
import { AccountDeactivatedError, EmailNotVerifiedError, IdentityMismatchError, NotInvitedError } from '../errors'
import type { Repositories } from '../ports/Repositories'

export class AuthService {
  constructor(private readonly repositories: Repositories) {}

  /**
   * Finds the user for an identity a provider asserted. Registration is
   * closed: only people a platform admin created can sign in.
   *
   * 1. A user with this identity signs in, whatever the email now says.
   * 2. Otherwise a verified email that matches a user links the identity to
   *    them, on their first sign-in.
   * 3. Anyone else is refused, and nothing is created.
   *
   * An unverified email never links. A deactivated user is refused either way.
   * @throws NotInvitedError
   * @throws EmailNotVerifiedError
   * @throws AccountDeactivatedError
   * @throws IdentityMismatchError
   */
  signIn(identity: ProviderIdentity): Promise<User> {
    return this.repositories.transaction(async (tx) => {
      const known = await tx.users.findByIdentity(identity)
      if (known?.deactivatedAt) {
        throw new AccountDeactivatedError()
      }
      if (known) {
        return this.refreshAvatar(tx, known, identity)
      }

      const user = await tx.users.findByEmail(identity.email)
      if (!user) {
        throw new NotInvitedError(identity.email)
      }
      if (!identity.emailVerified) {
        throw new EmailNotVerifiedError(identity.email)
      }
      if (user.deactivatedAt) {
        throw new AccountDeactivatedError()
      }
      if (user.identities.some(own => own.provider === identity.provider)) {
        throw new IdentityMismatchError(identity.provider)
      }
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
