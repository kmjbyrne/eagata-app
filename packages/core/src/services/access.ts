import type { OrgRole } from '../entities/Membership'
import type { Org } from '../entities/Org'
import type { User } from '../entities/User'
import type { Workspace } from '../entities/Workspace'
import { effectiveWorkspaceRole, type WorkspaceRole } from '../entities/WorkspaceMembership'
import { NotFoundError, NotSignedInError } from '../errors'
import type { CurrentUser } from '../ports/CurrentUser'
import type { TenancyRepositories } from '../ports/TenancyStore'
import type { UserId } from '../values/Ids'
import { parseSlug } from '../values/Slug'

export interface AccessibleWorkspace {
  workspace: Workspace
  role: WorkspaceRole
}

/** An org the user can reach, through an org membership or a workspace shared with them. */
export interface AccessibleOrg {
  org: Org
  /** Null when the user reaches the org only through shared workspaces. */
  role: OrgRole | null
  /** Oldest first. */
  workspaces: AccessibleWorkspace[]
}

export function requireUserId(currentUser: CurrentUser): UserId {
  if (!currentUser.userId) {
    throw new NotSignedInError()
  }
  return currentUser.userId
}

export async function requireUser(repositories: TenancyRepositories, currentUser: CurrentUser): Promise<User> {
  const user = await repositories.users.findById(requireUserId(currentUser))
  if (!user) {
    throw new NotSignedInError()
  }
  return user
}

/** The workspaces of one org the user can see, with their role in each. */
export async function accessibleWorkspaces(repositories: TenancyRepositories, org: Org, userId: UserId): Promise<AccessibleOrg | null> {
  const orgRole = (await repositories.memberships.find(org.id, userId))?.role ?? null
  const workspaces: AccessibleWorkspace[] = []
  for (const workspace of await repositories.workspaces.listByOrg(org.id)) {
    const role = effectiveWorkspaceRole(orgRole, await repositories.workspaceMembers.find(workspace.id, userId))
    if (role) {
      workspaces.push({ workspace, role })
    }
  }
  return orgRole || workspaces.length ? { org, role: orgRole, workspaces } : null
}

/**
 * The org at a current slug, if the user can reach it. Anyone else gets
 * NotFoundError, so they can't learn the org exists.
 */
export async function requireAccessibleOrg(repositories: TenancyRepositories, orgSlug: string, userId: UserId): Promise<AccessibleOrg> {
  const org = await repositories.orgs.findBySlug(parseSlugOrNotFound(orgSlug))
  const accessible = org && await accessibleWorkspaces(repositories, org, userId)
  if (!accessible) {
    throw new NotFoundError('Organization not found')
  }
  return accessible
}

/** A malformed slug can't name anything, so it is simply not found. */
export function parseSlugOrNotFound(input: string) {
  try {
    return parseSlug(input)
  } catch {
    throw new NotFoundError('Not found')
  }
}
