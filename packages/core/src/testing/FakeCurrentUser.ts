import type { CurrentUser } from '../ports/CurrentUser'
import type { UserId } from '../values/Ids'

export class FakeCurrentUser implements CurrentUser {
  constructor(public userId: UserId | null = null, public sessionVersion = 0) {}

  signInAs(userId: UserId, sessionVersion = 0): void {
    this.userId = userId
    this.sessionVersion = sessionVersion
  }

  signOut(): void {
    this.userId = null
    this.sessionVersion = 0
  }
}
