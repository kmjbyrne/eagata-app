import type { Org } from '../entities/Org'
import type { Workspace } from '../entities/Workspace'
import { roleAllows, type WorkspaceRole } from '../entities/WorkspaceMembership'
import { ForbiddenError, NotFoundError } from '../errors'
import type { CurrentUser } from '../ports/CurrentUser'
import type { Repositories } from '../ports/Repositories'
import type { UserId } from '../values/Ids'
import { parseSlugOrNotFound, requireAccessibleOrg, requireActiveUserId } from './access'

export interface WorkspaceGrant {
  org: Org
  workspace: Workspace
  role: WorkspaceRole
  userId: UserId
}

/**
 * The one check every service, in core and in apps, makes before acting in a
 * workspace: may the current user act here, and with what role?
 */
export class WorkspaceAccess {
  constructor(
    private readonly repositories: Repositories,
    private readonly currentUser: CurrentUser
  ) {}

  /**
   * @throws NotSignedInError
   * @throws NotFoundError if the user can't see the workspace, so its existence isn't revealed
   * @throws ForbiddenError if they can see it but their role is below `needed`
   */
  async require(orgSlug: string, workspaceSlug: string, needed: WorkspaceRole = 'viewer'): Promise<WorkspaceGrant> {
    const userId = await requireActiveUserId(this.repositories, this.currentUser)
    const { org, workspaces } = await requireAccessibleOrg(this.repositories, orgSlug, userId)
    const slug = parseSlugOrNotFound(workspaceSlug)
    const found = workspaces.find(entry => entry.workspace.slug === slug)
    if (!found) {
      throw new NotFoundError('Workspace not found')
    }
    if (!roleAllows(found.role, needed)) {
      throw new ForbiddenError(`This needs the ${needed} role in the workspace`)
    }
    return { org, workspace: found.workspace, role: found.role, userId }
  }
}
