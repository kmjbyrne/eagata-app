import type { LinkedIdentity, PlatformRoleGrant, User, UserIdentity } from '../entities/User'
import type { Email } from '../values/Email'
import type { UserId } from '../values/Ids'

export interface UserRepository {
  findById(id: UserId): Promise<User | null>
  findByEmail(email: Email): Promise<User | null>
  findByIdentity(identity: UserIdentity): Promise<User | null>
  /** By display name. */
  list(): Promise<User[]>
  /** Active ones only. */
  countPlatformAdmins(): Promise<number>
  /** @throws EmailTakenError */
  create(user: User): Promise<void>
  /**
   * Saves the display name, email, avatar and deactivation. Identities change
   * only through `linkIdentity`, and the platform role through `setPlatformRole`.
   * @throws EmailTakenError
   */
  update(user: User): Promise<void>
  /** Grants or replaces the user's platform role, or with null removes it. */
  setPlatformRole(userId: UserId, grant: PlatformRoleGrant | null): Promise<void>
  /** Does nothing if the user already has it. @throws IdentityInUseError */
  linkIdentity(userId: UserId, identity: LinkedIdentity): Promise<void>
}
