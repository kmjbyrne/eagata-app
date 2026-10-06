import type { WorkspaceInvitation } from '../entities/WorkspaceInvitation'
import type { Email } from '../values/Email'
import type { WorkspaceId } from '../values/Ids'

export interface WorkspaceInvitationRepository {
  /** Oldest first. */
  listByWorkspace(workspaceId: WorkspaceId): Promise<WorkspaceInvitation[]>
  listByEmail(email: Email): Promise<WorkspaceInvitation[]>
  /** Adds the invitation, or replaces the one for the same workspace and email. */
  put(invitation: WorkspaceInvitation): Promise<void>
  remove(workspaceId: WorkspaceId, email: Email): Promise<void>
}
