import type { WorkspaceMembership } from '../entities/WorkspaceMembership'
import type { UserId, WorkspaceId } from '../values/Ids'

export interface WorkspaceMembershipRepository {
  find(workspaceId: WorkspaceId, userId: UserId): Promise<WorkspaceMembership | null>
  listByWorkspace(workspaceId: WorkspaceId): Promise<WorkspaceMembership[]>
  listByUser(userId: UserId): Promise<WorkspaceMembership[]>
  /** @throws AlreadyMemberError */
  add(membership: WorkspaceMembership): Promise<void>
  /** Changes the role of an existing membership. */
  update(membership: WorkspaceMembership): Promise<void>
  remove(workspaceId: WorkspaceId, userId: UserId): Promise<void>
}
