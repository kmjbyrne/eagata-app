import { InvalidInputError, LastOwnerError } from '../errors'
import type { UserId, WorkspaceId } from '../values/Ids'
import type { OrgRole } from './Membership'

/** Least to most privileged. Each role can do everything the ones before it can. */
export const WORKSPACE_ROLES = ['viewer', 'editor', 'owner'] as const

export type WorkspaceRole = typeof WORKSPACE_ROLES[number]

/**
 * A user's access to one workspace. The user need not be a member of the
 * workspace's org: this is how a workspace is shared with outsiders.
 */
export interface WorkspaceMembership {
  userId: UserId
  workspaceId: WorkspaceId
  role: WorkspaceRole
}

export class InvalidWorkspaceRoleError extends InvalidInputError {
  constructor(readonly input: string) {
    super(`A workspace role is one of ${WORKSPACE_ROLES.join(', ')}. Got "${input}"`)
  }
}

export function parseWorkspaceRole(input: string): WorkspaceRole {
  if (!(WORKSPACE_ROLES as readonly string[]).includes(input)) {
    throw new InvalidWorkspaceRoleError(input)
  }
  return input as WorkspaceRole
}

export const roleAllows = (held: WorkspaceRole, required: WorkspaceRole) =>
  WORKSPACE_ROLES.indexOf(held) >= WORKSPACE_ROLES.indexOf(required)

/**
 * What a user may do in a workspace. The org's owners and admins act as its
 * owners. Anyone else needs a workspace membership. Null means no access.
 */
export function effectiveWorkspaceRole(orgRole: OrgRole | null, membership: WorkspaceMembership | null): WorkspaceRole | null {
  if (orgRole === 'owner' || orgRole === 'admin') {
    return 'owner'
  }
  return membership?.role ?? null
}

/**
 * Checks that a workspace still has an owner member after a member's role
 * changes, or after they leave (`role` null).
 * @throws LastOwnerError
 */
export function ensureWorkspaceOwnerRemains(memberships: WorkspaceMembership[], userId: UserId, role: WorkspaceRole | null): void {
  const owners = memberships.filter(membership =>
    membership.userId === userId ? role === 'owner' : membership.role === 'owner'
  )
  if (!owners.length) {
    throw new LastOwnerError('workspace')
  }
}
