import type { Membership } from '../entities/Membership'
import type { OrgId, UserId } from '../values/Ids'

export interface MembershipRepository {
  find(orgId: OrgId, userId: UserId): Promise<Membership | null>
  listByOrg(orgId: OrgId): Promise<Membership[]>
  listByUser(userId: UserId): Promise<Membership[]>
  /** @throws AlreadyMemberError */
  add(membership: Membership): Promise<void>
  /** Changes the role of an existing membership. */
  update(membership: Membership): Promise<void>
  remove(orgId: OrgId, userId: UserId): Promise<void>
}
