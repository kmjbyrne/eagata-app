import { ensureOwnerRemains, parseOrgRole, type OrgRole } from '../entities/Membership'
import { changeOrgSlug, type Org } from '../entities/Org'
import type { User } from '../entities/User'
import { DEFAULT_WORKSPACE, type Workspace } from '../entities/Workspace'
import { ForbiddenError, NotFoundError } from '../errors'
import type { CurrentUser } from '../ports/CurrentUser'
import type { IdGenerator } from '../ports/IdGenerator'
import type { Repositories } from '../ports/Repositories'
import type { OrgId, UserId, WorkspaceId } from '../values/Ids'
import { parseName } from '../values/Name'
import { parseOrgSlug, parseSlug, suggestSlug } from '../values/Slug'
import { parseSlugOrNotFound } from './access'
import type { FeatureAccess } from './FeatureAccess'
import { requirePlatformAdmin } from './platform'

export interface PlatformOrgSummary {
  org: Org
  memberCount: number
  workspaceCount: number
}

export interface PlatformOrgMember {
  user: User
  role: OrgRole
}

/** A flag from the catalog, and whether the org has it switched on. */
export interface PlatformOrgFeature {
  feature: string
  /** Null while it's off. */
  enabledAt: Date | null
  /** Who switched it on, if anyone still known did. */
  enabledBy: User | null
}

export interface PlatformOrgDetail {
  org: Org
  /** By display name. */
  members: PlatformOrgMember[]
  /** Oldest first. */
  workspaces: Workspace[]
  /** Every flag in the catalog, in catalog order. */
  features: PlatformOrgFeature[]
}

/** Company orgs and their org members, run by platform admins. */
export class PlatformOrgService {
  constructor(
    private readonly repositories: Repositories,
    private readonly currentUser: CurrentUser,
    private readonly ids: IdGenerator,
    private readonly features: FeatureAccess
  ) {}

  /**
   * A company org with its owner, and a "General" workspace the owner also
   * owns. The slug defaults to one suggested from the name.
   * @throws NotFoundError if the owner doesn't exist
   * @throws SlugTakenError
   */
  async create(name: string, ownerUserId: UserId, slug?: string): Promise<Org> {
    return this.repositories.transaction(async (tx) => {
      await requirePlatformAdmin(tx, this.currentUser)
      if (!(await tx.users.findById(ownerUserId))) {
        throw new NotFoundError('User not found')
      }
      const org: Org = {
        id: this.ids.next() as OrgId,
        name: parseName(name),
        slug: parseOrgSlug(slug ?? suggestSlug(name)),
        previousSlugs: [],
        isPersonal: false
      }
      await tx.orgs.create(org)
      await tx.memberships.add({ orgId: org.id, userId: ownerUserId, role: 'owner' })
      const workspaceId = this.ids.next() as WorkspaceId
      await tx.workspaces.create({
        id: workspaceId,
        orgId: org.id,
        name: parseName(DEFAULT_WORKSPACE.name),
        slug: parseSlug(DEFAULT_WORKSPACE.slug),
        createdAt: new Date()
      })
      await tx.workspaceMembers.add({ workspaceId, userId: ownerUserId, role: 'owner' })
      return org
    })
  }

  /** Every org, personal ones included, by name. */
  async list(): Promise<PlatformOrgSummary[]> {
    await requirePlatformAdmin(this.repositories, this.currentUser)
    const summaries: PlatformOrgSummary[] = []
    for (const org of await this.repositories.orgs.list()) {
      summaries.push({
        org,
        memberCount: (await this.repositories.memberships.listByOrg(org.id)).length,
        workspaceCount: (await this.repositories.workspaces.listByOrg(org.id)).length
      })
    }
    return summaries
  }

  /** By current slug. */
  async get(slug: string): Promise<PlatformOrgDetail> {
    await requirePlatformAdmin(this.repositories, this.currentUser)
    const org = await this.requireOrg(this.repositories, slug)
    const members: PlatformOrgMember[] = []
    for (const membership of await this.repositories.memberships.listByOrg(org.id)) {
      const user = await this.repositories.users.findById(membership.userId)
      if (user) {
        members.push({ user, role: membership.role })
      }
    }
    members.sort((a, b) => a.user.displayName.localeCompare(b.user.displayName))
    const rows = await this.repositories.orgFeatures.listByOrg(org.id)
    const features: PlatformOrgFeature[] = []
    for (const feature of this.features.catalog) {
      const row = rows.find(entry => entry.feature === feature)
      const enabledBy = row?.enabledBy ? await this.repositories.users.findById(row.enabledBy) : null
      features.push({ feature, enabledAt: row?.enabledAt ?? null, enabledBy })
    }
    return { org, members, workspaces: await this.repositories.workspaces.listByOrg(org.id), features }
  }

  /**
   * Switches a flagged feature on for the org. Already on, it stays as it was.
   * @throws NotFoundError for a feature outside the catalog
   */
  enableFeature(slug: string, feature: string): Promise<void> {
    return this.repositories.transaction(async (tx) => {
      const admin = await requirePlatformAdmin(tx, this.currentUser)
      const org = await this.requireOrg(tx, slug)
      await tx.orgFeatures.enable({ orgId: org.id, feature: this.features.requireKnown(feature), enabledAt: new Date(), enabledBy: admin.id })
    })
  }

  /** @throws NotFoundError for a feature outside the catalog */
  disableFeature(slug: string, feature: string): Promise<void> {
    return this.repositories.transaction(async (tx) => {
      await requirePlatformAdmin(tx, this.currentUser)
      const org = await this.requireOrg(tx, slug)
      await tx.orgFeatures.disable(org.id, this.features.requireKnown(feature))
    })
  }

  /** The old slug keeps redirecting. @throws SlugTakenError */
  changeSlug(slug: string, newSlug: string): Promise<Org> {
    return this.repositories.transaction(async (tx) => {
      await requirePlatformAdmin(tx, this.currentUser)
      const changed = changeOrgSlug(await this.requireOrg(tx, slug), parseOrgSlug(newSlug))
      await tx.orgs.update(changed)
      return changed
    })
  }

  /**
   * @throws ForbiddenError for a personal org, which has one member only
   * @throws AlreadyMemberError
   */
  addMember(slug: string, userId: UserId, role: string): Promise<void> {
    return this.repositories.transaction(async (tx) => {
      await requirePlatformAdmin(tx, this.currentUser)
      const org = await this.requireOrg(tx, slug)
      if (org.isPersonal) {
        throw new ForbiddenError('A personal organization has one member. Share a workspace instead')
      }
      if (!(await tx.users.findById(userId))) {
        throw new NotFoundError('User not found')
      }
      await tx.memberships.add({ orgId: org.id, userId, role: parseOrgRole(role) })
    })
  }

  /** @throws LastOwnerError if the org would have no owner */
  changeRole(slug: string, userId: UserId, role: string): Promise<void> {
    return this.repositories.transaction(async (tx) => {
      await requirePlatformAdmin(tx, this.currentUser)
      const org = await this.requireOrg(tx, slug)
      const parsedRole = parseOrgRole(role)
      const membership = await this.requireMembership(tx, org, userId)
      ensureOwnerRemains(await tx.memberships.listByOrg(org.id), userId, parsedRole)
      await tx.memberships.update({ ...membership, role: parsedRole })
    })
  }

  /**
   * Their memberships of the org's workspaces go too, even where they were the
   * last owner member: the org's owners still manage every workspace.
   * @throws LastOwnerError if the org would have no owner
   */
  removeMember(slug: string, userId: UserId): Promise<void> {
    return this.repositories.transaction(async (tx) => {
      await requirePlatformAdmin(tx, this.currentUser)
      const org = await this.requireOrg(tx, slug)
      await this.requireMembership(tx, org, userId)
      ensureOwnerRemains(await tx.memberships.listByOrg(org.id), userId, null)
      await tx.memberships.remove(org.id, userId)
      const workspaceIds = new Set((await tx.workspaces.listByOrg(org.id)).map(workspace => workspace.id))
      for (const membership of await tx.workspaceMembers.listByUser(userId)) {
        if (workspaceIds.has(membership.workspaceId)) {
          await tx.workspaceMembers.remove(membership.workspaceId, userId)
        }
      }
    })
  }

  private async requireOrg(tx: Repositories, slug: string): Promise<Org> {
    const org = await tx.orgs.findBySlug(parseSlugOrNotFound(slug))
    if (!org) {
      throw new NotFoundError('Organization not found')
    }
    return org
  }

  private async requireMembership(tx: Repositories, org: Org, userId: UserId) {
    const membership = await tx.memberships.find(org.id, userId)
    if (!membership) {
      throw new NotFoundError('That user is not a member of this organization')
    }
    return membership
  }
}
