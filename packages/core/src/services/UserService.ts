import { isPlatformAdmin, type User } from '../entities/User'
import { InvalidInputError, LastPlatformAdminError } from '../errors'
import type { CurrentUser } from '../ports/CurrentUser'
import type { Repositories } from '../ports/Repositories'
import { requireUser } from './access'

export class UserService {
  constructor(
    private readonly repositories: Repositories,
    private readonly currentUser: CurrentUser
  ) {}

  /** The signed-in user, including their platform role and identities. @throws NotSignedInError */
  getMe(): Promise<User> {
    return requireUser(this.repositories, this.currentUser)
  }

  /**
   * Deactivates the signed-in user's own account, confirmed by typing their
   * email. Their sessions stop working and nothing is removed: only a
   * platform admin can reactivate them.
   * @throws InvalidInputError if the email isn't theirs
   * @throws LastPlatformAdminError for the only active platform admin
   */
  deactivateMe(confirmEmail: string): Promise<void> {
    return this.repositories.transaction(async (tx) => {
      const user = await requireUser(tx, this.currentUser)
      if (confirmEmail.trim().toLowerCase() !== user.email) {
        throw new InvalidInputError('Type your email exactly to confirm')
      }
      if (isPlatformAdmin(user) && await tx.users.countPlatformAdmins() <= 1) {
        throw new LastPlatformAdminError()
      }
      await tx.users.update({ ...user, deactivatedAt: new Date() })
    })
  }
}
