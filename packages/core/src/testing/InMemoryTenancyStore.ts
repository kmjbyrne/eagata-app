import { orgSlugs, type Org } from '../entities/Org'
import type { Membership } from '../entities/Membership'
import type { User, UserIdentity } from '../entities/User'
import type { Workspace } from '../entities/Workspace'
import { AlreadyMemberError, EmailTakenError, IdentityInUseError, SlugTakenError } from '../errors'
import type { MembershipRepository } from '../ports/MembershipRepository'
import type { OrgRepository } from '../ports/OrgRepository'
import type { TenancyRepositories, TenancyStore } from '../ports/TenancyStore'
import type { UserRepository } from '../ports/UserRepository'
import type { WorkspaceRepository } from '../ports/WorkspaceRepository'
import type { Email } from '../values/Email'
import type { OrgId, UserId } from '../values/Ids'
import type { Slug } from '../values/Slug'

interface State {
  users: User[]
  orgs: Org[]
  workspaces: Workspace[]
  memberships: Membership[]
}

const copy = <T>(value: T): T => structuredClone(value)
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)
const sameIdentity = (a: UserIdentity, b: UserIdentity) => a.provider === b.provider && a.subject === b.subject

/**
 * Every core repository on plain arrays, for tests. Each call outside a
 * transaction runs as a transaction of its own, so none is lost to another.
 */
export class InMemoryTenancyStore implements TenancyStore {
  private state: State = { users: [], orgs: [], workspaces: [], memberships: [] }
  private queue: Promise<unknown> = Promise.resolve()
  readonly users = this.queued('users')
  readonly orgs = this.queued('orgs')
  readonly workspaces = this.queued('workspaces')
  readonly memberships = this.queued('memberships')

  transaction<R>(fn: (repositories: TenancyRepositories) => Promise<R>): Promise<R> {
    const result = this.queue.then(async () => {
      const snapshot = copy(this.state)
      const value = await fn(repositories(() => snapshot))
      this.state = snapshot
      return value
    })
    this.queue = result.catch(() => undefined)
    return result
  }

  private queued<K extends keyof TenancyRepositories>(name: K): TenancyRepositories[K] {
    return new Proxy({}, {
      get: (_, method: string) => (...args: unknown[]) =>
        this.transaction(repositories => (repositories[name] as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>)[method]!(...args))
    }) as TenancyRepositories[K]
  }
}

function repositories(state: () => State): TenancyRepositories {
  return {
    users: new InMemoryUserRepository(state),
    orgs: new InMemoryOrgRepository(state),
    workspaces: new InMemoryWorkspaceRepository(state),
    memberships: new InMemoryMembershipRepository(state)
  }
}

class InMemoryUserRepository implements UserRepository {
  constructor(private readonly state: () => State) {}

  async findById(id: UserId) {
    return copy(this.state().users.find(user => user.id === id) ?? null)
  }

  async findByEmail(email: Email) {
    return copy(this.state().users.find(user => user.email === email) ?? null)
  }

  async findByIdentity(identity: UserIdentity) {
    return copy(this.state().users.find(user => user.identities.some(own => sameIdentity(own, identity))) ?? null)
  }

  async list() {
    return copy(this.state().users).sort((a, b) => a.displayName.localeCompare(b.displayName))
  }

  async countPlatformAdmins() {
    return this.state().users.filter(user => user.isPlatformAdmin).length
  }

  async create(user: User) {
    this.requireEmailFree(user)
    this.state().users.push(copy(user))
  }

  async update(user: User) {
    this.requireEmailFree(user)
    const stored = this.state().users.find(existing => existing.id === user.id)
    if (stored) {
      Object.assign(stored, copy({ ...user, identities: stored.identities }))
    }
  }

  async linkIdentity(userId: UserId, identity: UserIdentity) {
    const owner = this.state().users.find(user => user.identities.some(own => sameIdentity(own, identity)))
    if (owner && owner.id !== userId) {
      throw new IdentityInUseError(identity.provider)
    }
    this.state().users.find(user => user.id === userId)?.identities.push(...(owner ? [] : [copy(identity)]))
  }

  private requireEmailFree(user: User) {
    if (this.state().users.some(existing => existing.email === user.email && existing.id !== user.id)) {
      throw new EmailTakenError(user.email)
    }
  }
}

class InMemoryOrgRepository implements OrgRepository {
  constructor(private readonly state: () => State) {}

  async findById(id: OrgId) {
    return copy(this.state().orgs.find(org => org.id === id) ?? null)
  }

  async findBySlug(slug: Slug) {
    return copy(this.state().orgs.find(org => org.slug === slug) ?? null)
  }

  async findBySlugOrPrevious(slug: Slug) {
    return copy(this.state().orgs.find(org => orgSlugs(org).includes(slug)) ?? null)
  }

  async list() {
    return copy(this.state().orgs).sort(byName)
  }

  async create(org: Org) {
    this.requireSlugsFree(org)
    this.state().orgs.push(copy(org))
  }

  async update(org: Org) {
    this.requireSlugsFree(org)
    const index = this.state().orgs.findIndex(existing => existing.id === org.id)
    if (index !== -1) {
      this.state().orgs[index] = copy(org)
    }
  }

  private requireSlugsFree(org: Org) {
    const taken = new Set(this.state().orgs.filter(other => other.id !== org.id).flatMap(orgSlugs))
    const clash = orgSlugs(org).find(slug => taken.has(slug))
    if (clash) {
      throw new SlugTakenError(clash)
    }
  }
}

class InMemoryWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly state: () => State) {}

  async findBySlug(orgId: OrgId, slug: Slug) {
    return copy(this.state().workspaces.find(workspace => workspace.orgId === orgId && workspace.slug === slug) ?? null)
  }

  async listByOrg(orgId: OrgId) {
    return copy(this.state().workspaces.filter(workspace => workspace.orgId === orgId))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  async create(workspace: Workspace) {
    if (await this.findBySlug(workspace.orgId, workspace.slug)) {
      throw new SlugTakenError(workspace.slug)
    }
    this.state().workspaces.push(copy(workspace))
  }
}

class InMemoryMembershipRepository implements MembershipRepository {
  constructor(private readonly state: () => State) {}

  async find(orgId: OrgId, userId: UserId) {
    return copy(this.state().memberships.find(membership => membership.orgId === orgId && membership.userId === userId) ?? null)
  }

  async listByOrg(orgId: OrgId) {
    return copy(this.state().memberships.filter(membership => membership.orgId === orgId))
  }

  async listByUser(userId: UserId) {
    return copy(this.state().memberships.filter(membership => membership.userId === userId))
  }

  async add(membership: Membership) {
    if (await this.find(membership.orgId, membership.userId)) {
      throw new AlreadyMemberError()
    }
    this.state().memberships.push(copy(membership))
  }

  async update(membership: Membership) {
    const stored = this.state().memberships.find(existing => existing.orgId === membership.orgId && existing.userId === membership.userId)
    if (stored) {
      stored.role = membership.role
    }
  }

  async remove(orgId: OrgId, userId: UserId) {
    const { memberships } = this.state()
    const index = memberships.findIndex(membership => membership.orgId === orgId && membership.userId === userId)
    if (index !== -1) {
      memberships.splice(index, 1)
    }
  }
}
