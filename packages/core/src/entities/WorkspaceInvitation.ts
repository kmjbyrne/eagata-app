import type { Email } from '../values/Email'
import type { UserId, WorkspaceId } from '../values/Ids'
import type { WorkspaceRole } from './WorkspaceMembership'

/**
 * An invitation to a workspace, by email. Inviting answers the same whether
 * or not the email has an account, so it can't be used to find out who does.
 * It becomes a membership when someone with that email next opens the app.
 */
export interface WorkspaceInvitation {
  workspaceId: WorkspaceId
  email: Email
  role: WorkspaceRole
  invitedBy: UserId
  createdAt: Date
}
