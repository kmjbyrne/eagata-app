import type { User } from '../entities/User'
import type { CurrentUser } from '../ports/CurrentUser'
import type { TenancyStore } from '../ports/TenancyStore'
import { requireUser } from './access'

export class UserService {
  constructor(
    private readonly store: TenancyStore,
    private readonly currentUser: CurrentUser
  ) {}

  /** The signed-in user, including their platform role and identities. @throws NotSignedInError */
  getMe(): Promise<User> {
    return requireUser(this.store, this.currentUser)
  }
}
