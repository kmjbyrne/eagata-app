import type { User } from '../entities/User'
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
}
