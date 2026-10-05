import type { OrgRole } from '../entities/Membership'
import type { Org } from '../entities/Org'
import { isPlatformAdmin, type User } from '../entities/User'
import { ForbiddenError, LastPlatformAdminError, NotFoundError } from '../errors'
import type { CurrentUser } from '../ports/CurrentUser'
import type { IdGenerator } from '../ports/IdGenerator'
import type { Repositories } from '../ports/Repositories'
import { parseEmail } from '../values/Email'
import type { UserId } from '../values/Ids'
import { requirePlatformAdmin } from './platform'
import { provisionUser } from './provisionUser'

export interface PlatformUserDetail {
  user: User
  /** Org memberships, personal org first, then by org name. */
  orgs: { org: Org, role: OrgRole }[]
  /** Who granted their platform role, when they have one and it wasn't from the command line. */
  platformRoleGrantedBy: User | null
}

/** Users and the platform role, run by platform admins. */
export class PlatformUserService {
  constructor(
    private readonly repositories: Repositories,
    private readonly currentUser: CurrentUser,
    private readonly ids: IdGenerator
  ) {}

  /**
   * A user who can sign in with this email, with their personal org, ready to
   * be added to company orgs before they first sign in.
   * @throws EmailTakenError
   */
  create(displayName: string, email: string): Promise<User> {
    return this.repositories.transaction(async (tx) => {
      await requirePlatformAdmin(tx, this.currentUser)
      return provisionUser(tx, this.ids, { displayName, email: parseEmail(email) })
    })
  }

  /** By display name. */
  async list(): Promise<User[]> {
    await requirePlatformAdmin(this.repositories, this.currentUser)
    return this.repositories.users.list()
  }

  async get(id: UserId): Promise<PlatformUserDetail> {
    await requirePlatformAdmin(this.repositories, this.currentUser)
    const user = await this.repositories.users.findById(id)
    if (!user) {
      throw new NotFoundError('User not found')
    }
    const orgs: PlatformUserDetail['orgs'] = []
    for (const membership of await this.repositories.memberships.listByUser(id)) {
      const org = await this.repositories.orgs.findById(membership.orgId)
      if (org) {
        orgs.push({ org, role: membership.role })
      }
    }
    orgs.sort((a, b) => Number(b.org.isPersonal) - Number(a.org.isPersonal) || a.org.name.localeCompare(b.org.name))
    const grantedBy = user.platformRole?.grantedBy
    return { user, orgs, platformRoleGrantedBy: grantedBy ? await this.repositories.users.findById(grantedBy) : null }
  }

  /**
   * Grants the platform role, recording who granted it and when, or revokes
   * it. Granting it again keeps the first grant.
   * @throws LastPlatformAdminError when revoking the only platform admin
   */
  setPlatformAdmin(id: UserId, value: boolean): Promise<User> {
    return this.repositories.transaction(async (tx) => {
      const admin = await requirePlatformAdmin(tx, this.currentUser)
      const user = await tx.users.findById(id)
      if (!user) {
        throw new NotFoundError('User not found')
      }
      if (value === isPlatformAdmin(user)) {
        return user
      }
      if (!value && !user.deactivatedAt && await tx.users.countPlatformAdmins() <= 1) {
        throw new LastPlatformAdminError()
      }
      const updated: User = { ...user, platformRole: value ? { role: 'admin', grantedAt: new Date(), grantedBy: admin.id } : null }
      await tx.users.setPlatformRole(user.id, updated.platformRole)
      return updated
    })
  }

  /**
   * Deactivating stops sign-in and ends the user's sessions. Nothing of
   * theirs is removed, so reactivating restores their access.
   * @throws ForbiddenError when deactivating yourself
   * @throws LastPlatformAdminError when deactivating the only active platform admin
   */
  setDeactivated(id: UserId, value: boolean): Promise<User> {
    return this.repositories.transaction(async (tx) => {
      const admin = await requirePlatformAdmin(tx, this.currentUser)
      const user = await tx.users.findById(id)
      if (!user) {
        throw new NotFoundError('User not found')
      }
      if (value && user.id === admin.id) {
        throw new ForbiddenError('You can\'t deactivate yourself')
      }
      if (value && isPlatformAdmin(user) && !user.deactivatedAt && await tx.users.countPlatformAdmins() <= 1) {
        throw new LastPlatformAdminError()
      }
      const updated = { ...user, deactivatedAt: value ? (user.deactivatedAt ?? new Date()) : null }
      await tx.users.update(updated)
      return updated
    })
  }
}
