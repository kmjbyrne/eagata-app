import { NotFoundError } from '../errors'
import type { CurrentUser } from '../ports/CurrentUser'
import type { TenancyStore } from '../ports/TenancyStore'
import type { Slug } from '../values/Slug'
import { accessibleWorkspaces, parseSlugOrNotFound, requireAccessibleOrg, requireUserId, type AccessibleOrg } from './access'

export class OrgService {
  constructor(
    private readonly store: TenancyStore,
    private readonly currentUser: CurrentUser
  ) {}

  /**
   * Every org the user can reach, with their role and the workspaces they can
   * see in each. Their personal org comes first, then the rest by name.
   */
  async listMine(): Promise<AccessibleOrg[]> {
    const userId = requireUserId(this.currentUser)
    const orgIds = new Set((await this.store.memberships.listByUser(userId)).map(membership => membership.orgId))
    for (const membership of await this.store.workspaceMembers.listByUser(userId)) {
      const workspace = await this.store.workspaces.findById(membership.workspaceId)
      if (workspace) {
        orgIds.add(workspace.orgId)
      }
    }
    const orgs: AccessibleOrg[] = []
    for (const orgId of orgIds) {
      const org = await this.store.orgs.findById(orgId)
      const accessible = org && await accessibleWorkspaces(this.store, org, userId)
      if (accessible) {
        orgs.push(accessible)
      }
    }
    const isOwnPersonal = (entry: AccessibleOrg) => entry.org.isPersonal && entry.role === 'owner'
    return orgs.sort((a, b) => Number(isOwnPersonal(b)) - Number(isOwnPersonal(a)) || a.org.name.localeCompare(b.org.name))
  }

  /** @throws NotFoundError for an org the user can't reach, or an old slug */
  getBySlug(slug: string): Promise<AccessibleOrg> {
    return requireAccessibleOrg(this.store, slug, requireUserId(this.currentUser))
  }

  /**
   * The current slug of the org an old slug belonged to, so old links can
   * redirect. Only for users who can reach the org.
   * @throws NotFoundError
   */
  async resolveSlug(slug: string): Promise<Slug> {
    const userId = requireUserId(this.currentUser)
    const org = await this.store.orgs.findBySlugOrPrevious(parseSlugOrNotFound(slug))
    if (!org || !(await accessibleWorkspaces(this.store, org, userId))) {
      throw new NotFoundError('Organization not found')
    }
    return org.slug
  }
}
