import type { OrgRole } from '../entities/Membership'
import type { Org } from '../entities/Org'
import type { User } from '../entities/User'
import { LastPlatformAdminError, NotFoundError } from '../errors'
import type { CurrentUser } from '../ports/CurrentUser'
import type { IdGenerator } from '../ports/IdGenerator'
import type { TenancyStore } from '../ports/TenancyStore'
import { parseEmail } from '../values/Email'
import type { UserId } from '../values/Ids'
import { requirePlatformAdmin } from './platform'
import { provisionUser } from './provisionUser'

export interface PlatformUserDetail {
  user: User
  /** Org memberships, personal org first, then by org name. */
  orgs: { org: Org, role: OrgRole }[]
}

/** Users and the platform role, run by platform admins. */
export class PlatformUserService {
  constructor(
    private readonly store: TenancyStore,
    private readonly currentUser: CurrentUser,
    private readonly ids: IdGenerator
  ) {}

  /**
   * A user who can sign in with this email, with their personal org, ready to
   * be added to company orgs before they first sign in.
   * @throws EmailTakenError
   */
  create(displayName: string, email: string): Promise<User> {
    return this.store.transaction(async (repositories) => {
      await requirePlatformAdmin(repositories, this.currentUser)
      return provisionUser(repositories, this.ids, { displayName, email: parseEmail(email) })
    })
  }

  /** By display name. */
  async list(): Promise<User[]> {
    await requirePlatformAdmin(this.store, this.currentUser)
    return this.store.users.list()
  }

  async get(id: UserId): Promise<PlatformUserDetail> {
    await requirePlatformAdmin(this.store, this.currentUser)
    const user = await this.store.users.findById(id)
    if (!user) {
      throw new NotFoundError('User not found')
    }
    const orgs: PlatformUserDetail['orgs'] = []
    for (const membership of await this.store.memberships.listByUser(id)) {
      const org = await this.store.orgs.findById(membership.orgId)
      if (org) {
        orgs.push({ org, role: membership.role })
      }
    }
    orgs.sort((a, b) => Number(b.org.isPersonal) - Number(a.org.isPersonal) || a.org.name.localeCompare(b.org.name))
    return { user, orgs }
  }

  /** @throws LastPlatformAdminError when revoking the only platform admin */
  setPlatformAdmin(id: UserId, value: boolean): Promise<User> {
    return this.store.transaction(async (repositories) => {
      await requirePlatformAdmin(repositories, this.currentUser)
      const user = await repositories.users.findById(id)
      if (!user) {
        throw new NotFoundError('User not found')
      }
      if (user.isPlatformAdmin && !value && await repositories.users.countPlatformAdmins() <= 1) {
        throw new LastPlatformAdminError()
      }
      const updated = { ...user, isPlatformAdmin: value }
      await repositories.users.update(updated)
      return updated
    })
  }
}
