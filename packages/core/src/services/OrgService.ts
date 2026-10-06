import { NotFoundError } from '../errors'
import type { CurrentUser } from '../ports/CurrentUser'
import type { Repositories } from '../ports/Repositories'
import type { Slug } from '../values/Slug'
import { type AccessibleOrg, accessibleWorkspaces, parseSlugOrNotFound, requireAccessibleOrg, requireActiveUserId, requireUser } from './access'
import { acceptInvitations } from './acceptInvitations'
import type { FeatureAccess } from './FeatureAccess'

/** An org the user can reach, with the flagged features it has switched on. */
export interface MyOrg extends AccessibleOrg {
  features: string[]
}

export class OrgService {
  constructor(
    private readonly repositories: Repositories,
    private readonly currentUser: CurrentUser,
    private readonly features: FeatureAccess
  ) {}

  /**
   * Every org the user can reach, with their role and the workspaces they can
   * see in each. Their personal org comes first, then the rest by name.
   */
  async listMine(): Promise<MyOrg[]> {
    const user = await requireUser(this.repositories, this.currentUser)
    await acceptInvitations(this.repositories, user)
    const userId = user.id
    const orgIds = new Set((await this.repositories.memberships.listByUser(userId)).map(membership => membership.orgId))
    for (const membership of await this.repositories.workspaceMembers.listByUser(userId)) {
      const workspace = await this.repositories.workspaces.findById(membership.workspaceId)
      if (workspace) {
        orgIds.add(workspace.orgId)
      }
    }
    const orgs: MyOrg[] = []
    for (const orgId of orgIds) {
      const org = await this.repositories.orgs.findById(orgId)
      const accessible = org && await accessibleWorkspaces(this.repositories, org, userId)
      if (accessible) {
        orgs.push({ ...accessible, features: await this.features.of(orgId) })
      }
    }
    const isOwnPersonal = (entry: AccessibleOrg) => entry.org.isPersonal && entry.role === 'owner'
    return orgs.sort((a, b) => Number(isOwnPersonal(b)) - Number(isOwnPersonal(a)) || a.org.name.localeCompare(b.org.name))
  }

  /**
   * Where `/` takes the user: the last-used workspace if they can still reach
   * it, else the first workspace of their only org. Null means they reach
   * several orgs, and should choose.
   */
  async home(last?: { org?: string, workspace?: string }): Promise<{ org: Slug, workspace: Slug } | null> {
    const orgs = await this.listMine()
    const lastUsed = orgs.find(entry => entry.org.slug === last?.org)?.workspaces.find(entry => entry.workspace.slug === last?.workspace)
    if (lastUsed) {
      return { org: orgs.find(entry => entry.workspaces.includes(lastUsed))!.org.slug, workspace: lastUsed.workspace.slug }
    }
    const [only] = orgs
    const first = orgs.length === 1 ? only!.workspaces[0] : undefined
    return first ? { org: only!.org.slug, workspace: first.workspace.slug } : null
  }

  /** @throws NotFoundError for an org the user can't reach, or an old slug */
  async getBySlug(slug: string): Promise<MyOrg> {
    const accessible = await requireAccessibleOrg(this.repositories, slug, await requireActiveUserId(this.repositories, this.currentUser))
    return { ...accessible, features: await this.features.of(accessible.org.id) }
  }

  /**
   * The current slug of the org an old slug belonged to, so old links can
   * redirect. Only for users who can reach the org.
   * @throws NotFoundError
   */
  async resolveSlug(slug: string): Promise<Slug> {
    const userId = await requireActiveUserId(this.repositories, this.currentUser)
    const org = await this.repositories.orgs.findBySlugOrPrevious(parseSlugOrNotFound(slug))
    if (!org || !(await accessibleWorkspaces(this.repositories, org, userId))) {
      throw new NotFoundError('Organization not found')
    }
    return org.slug
  }
}
