import { type AccessibleOrg, type AccessibleWorkspace, type Org, orgPermissions, type Workspace, type WorkspaceInvitation, type WorkspaceMember, workspacePermissions } from '@kmjbyrne/core'
import type { AccessibleOrgResponse, AccessibleWorkspaceResponse, OrgSummary } from '../../shared/contracts/orgs'
import type { InvitationResponse, WorkspaceMemberResponse, WorkspaceResponse } from '../../shared/contracts/workspaces'

// Entities never leave the server as they are: routes map them to contracts.

export const toOrgSummary = (org: Org): OrgSummary =>
  ({ id: org.id, name: org.name, slug: org.slug, isPersonal: org.isPersonal })

export const toWorkspaceResponse = (workspace: Workspace): WorkspaceResponse =>
  ({ id: workspace.id, name: workspace.name, slug: workspace.slug })

export const toAccessibleWorkspace = ({ workspace, role }: AccessibleWorkspace): AccessibleWorkspaceResponse =>
  ({ ...toWorkspaceResponse(workspace), role, permissions: workspacePermissions.of(role) })

export const toAccessibleOrg = (entry: AccessibleOrg): AccessibleOrgResponse =>
  ({
    org: toOrgSummary(entry.org),
    role: entry.role,
    permissions: entry.role ? orgPermissions.of(entry.role) : [],
    workspaces: entry.workspaces.map(toAccessibleWorkspace)
  })

export const toWorkspaceMember = ({ user, role }: WorkspaceMember): WorkspaceMemberResponse =>
  ({ user: { id: user.id, displayName: user.displayName, email: user.email, avatarUrl: user.avatarUrl }, role })

export const toInvitation = ({ email, role, createdAt }: WorkspaceInvitation): InvitationResponse =>
  ({ email, role, createdAt: createdAt.toISOString() })
