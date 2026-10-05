import type { CurrentUser } from '../ports/CurrentUser'
import type { UserId } from '../values/Ids'

export class FakeCurrentUser implements CurrentUser {
  constructor(public userId: UserId | null = null) {}

  signInAs(userId: UserId): void {
    this.userId = userId
  }

  signOut(): void {
    this.userId = null
  }
}
