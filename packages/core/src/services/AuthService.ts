import type { ProviderIdentity, User, UserIdentity } from '../entities/User'
import { AccountDeactivatedError, EmailNotVerifiedError, IdentityInUseError, IdentityMismatchError, NotInvitedError } from '../errors'
import type { CurrentUser } from '../ports/CurrentUser'
import type { LinkProof } from '../ports/LinkProof'
import type { Repositories } from '../ports/Repositories'
import type { Email } from '../values/Email'
import type { UserId } from '../values/Ids'
import { requireUser } from './access'

/** A provider account waiting to be linked, once the user proves they own the account it matched. */
export interface PendingLink {
  userId: UserId
  identity: UserIdentity
  email: Email
  picture: string | null
}

export type SignInResult
  = | { kind: 'signed-in', user: User }
    | { kind: 'link-required', link: PendingLink }

const noProofNeeded: LinkProof = { requiredFor: async () => false }

export class AuthService {
  constructor(
    private readonly repositories: Repositories,
    private readonly currentUser: CurrentUser,
    private readonly linkProof: LinkProof = noProofNeeded
  ) {}

  /**
   * Finds the user for an identity a provider asserted. Registration is
   * closed: only people a platform admin created can sign in.
   *
   * 1. A user with this identity signs in, whatever the email now says.
   * 2. Otherwise a verified email that matches a user links the identity to
   *    them, on their first sign-in. If `LinkProof` says the user must prove
   *    they own the account first, such as with their password, nothing is
   *    linked yet: the result is `link-required`.
   * 3. Anyone else is refused, and nothing is created.
   *
   * An unverified email never links. A deactivated user is refused either way.
   * @throws NotInvitedError
   * @throws EmailNotVerifiedError
   * @throws AccountDeactivatedError
   * @throws IdentityMismatchError
   */
  signIn(identity: ProviderIdentity): Promise<SignInResult> {
    return this.repositories.transaction(async (tx) => {
      const known = await tx.users.findByIdentity(identity)
      if (known?.deactivatedAt) {
        throw new AccountDeactivatedError()
      }
      if (known) {
        return { kind: 'signed-in', user: await this.refreshAvatar(tx, known, identity.picture) }
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
      if (await this.linkProof.requiredFor(user.id)) {
        return { kind: 'link-required', link: { userId: user.id, identity: link, email: identity.email, picture: identity.picture } }
      }
      await tx.users.linkIdentity(user.id, link)
      return { kind: 'signed-in', user: await this.refreshAvatar(tx, { ...user, identities: [...user.identities, link] }, identity.picture) }
    })
  }

  /**
   * Links a provider account to the signed-in user, from their settings. They
   * are already signed in, so no other proof is needed.
   * @throws IdentityInUseError if another user has the account
   * @throws IdentityMismatchError if they already have a different account at the provider
   */
  connectIdentity(identity: ProviderIdentity): Promise<User> {
    return this.repositories.transaction(async (tx) => {
      const user = await requireUser(tx, this.currentUser)
      const owner = await tx.users.findByIdentity(identity)
      if (owner && owner.id !== user.id) {
        throw new IdentityInUseError(identity.provider)
      }
      if (owner) {
        return this.refreshAvatar(tx, user, identity.picture)
      }
      if (user.identities.some(own => own.provider === identity.provider)) {
        throw new IdentityMismatchError(identity.provider)
      }
      const link = { provider: identity.provider, subject: identity.subject }
      await tx.users.linkIdentity(user.id, link)
      return this.refreshAvatar(tx, { ...user, identities: [...user.identities, link] }, identity.picture)
    })
  }

  private async refreshAvatar(tx: Repositories, user: User, picture: string | null): Promise<User> {
    if (user.avatarUrl === picture) {
      return user
    }
    const updated = { ...user, avatarUrl: picture }
    await tx.users.update(updated)
    return updated
  }
}
