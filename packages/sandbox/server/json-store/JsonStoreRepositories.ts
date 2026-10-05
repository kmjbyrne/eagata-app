import {
  AlreadyMemberError,
  EmailTakenError,
  IdentityInUseError,
  orgSlugs,
  SlugTakenError,
  type Email,
  type Membership,
  type MembershipRepository,
  type Name,
  type Org,
  type OrgId,
  type OrgRepository,
  type Repositories,
  type Slug,
  type User,
  type UserId,
  type UserIdentity,
  type UserRepository,
  type Workspace,
  type WorkspaceId,
  type WorkspaceMembership,
  type WorkspaceMembershipRepository,
  type WorkspaceRepository
} from '@kmjbyrne/core'
import type { JsonStore } from '@kmjbyrne/json-store'
import type { TenancyDocuments } from './collections'
import { membershipId, workspaceMemberId, type OrgRecord, type UserRecord, type WorkspaceRecord } from './records'

type Store = JsonStore<TenancyDocuments>

const sameIdentity = (a: UserIdentity, b: UserIdentity) => a.provider === b.provider && a.subject === b.subject

const toUser = (record: UserRecord): User => ({
  id: record.id as UserId,
  displayName: record.displayName as Name,
  email: record.email as Email,
  avatarUrl: record.avatarUrl,
  isPlatformAdmin: record.isPlatformAdmin,
  identities: record.identities,
  deactivatedAt: record.deactivatedAt ? new Date(record.deactivatedAt) : null
})

const toUserRecord = (user: User): UserRecord => ({
  ...user,
  deactivatedAt: user.deactivatedAt?.toISOString() ?? null
})

const toOrg = (record: OrgRecord): Org => ({
  id: record.id as OrgId,
  name: record.name as Name,
  slug: record.slug as Slug,
  previousSlugs: record.previousSlugs as Slug[],
  isPersonal: record.isPersonal
})

const toWorkspace = (record: WorkspaceRecord): Workspace => ({
  id: record.id as WorkspaceId,
  orgId: record.orgId as OrgId,
  name: record.name as Name,
  slug: record.slug as Slug,
  createdAt: new Date(record.createdAt)
})

/**
 * Core's repositories on a JSON store, for the sandbox. Each write checks
 * its uniqueness rules and writes in one store transaction, so concurrent
 * requests can't both pass a check.
 */
export class JsonStoreRepositories implements Repositories {
  readonly users: UserRepository
  readonly orgs: OrgRepository
  readonly workspaces: WorkspaceRepository
  readonly memberships: MembershipRepository
  readonly workspaceMembers: WorkspaceMembershipRepository

  constructor(private readonly store: Store) {
    this.users = new JsonUserRepository(store)
    this.orgs = new JsonOrgRepository(store)
    this.workspaces = new JsonWorkspaceRepository(store)
    this.memberships = new JsonMembershipRepository(store)
    this.workspaceMembers = new JsonWorkspaceMembershipRepository(store)
  }

  transaction<R>(fn: (tx: Repositories) => Promise<R>): Promise<R> {
    return this.store.transaction(tx => fn(new JsonStoreRepositories(tx)))
  }
}

class JsonUserRepository implements UserRepository {
  constructor(private readonly store: Store) {}

  async findById(id: UserId) {
    const record = await this.store.get('users', id)
    return record ? toUser(record) : null
  }

  async findByEmail(email: Email) {
    const [record] = await this.store.find('users', user => user.email === email)
    return record ? toUser(record) : null
  }

  async findByIdentity(identity: UserIdentity) {
    const [record] = await this.store.find('users', user => user.identities.some(own => sameIdentity(own, identity)))
    return record ? toUser(record) : null
  }

  async list() {
    return (await this.store.find('users'))
      .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id))
      .map(toUser)
  }

  async countPlatformAdmins() {
    return (await this.store.find('users', user => user.isPlatformAdmin && !user.deactivatedAt)).length
  }

  create(user: User) {
    return this.store.transaction(async (tx) => {
      await requireEmailFree(tx, user)
      await tx.put('users', toUserRecord(user))
    })
  }

  update(user: User) {
    return this.store.transaction(async (tx) => {
      const stored = await tx.get('users', user.id)
      if (!stored) {
        return
      }
      await requireEmailFree(tx, user)
      await tx.put('users', { ...toUserRecord(user), identities: stored.identities })
    })
  }

  linkIdentity(userId: UserId, identity: UserIdentity) {
    return this.store.transaction(async (tx) => {
      const [owner] = await tx.find('users', user => user.identities.some(own => sameIdentity(own, identity)))
      if (owner && owner.id !== userId) {
        throw new IdentityInUseError(identity.provider)
      }
      const user = await tx.get('users', userId)
      if (user && !owner) {
        await tx.put('users', { ...user, identities: [...user.identities, { provider: identity.provider, subject: identity.subject }] })
      }
    })
  }
}

async function requireEmailFree(store: Store, user: User) {
  if ((await store.find('users', other => other.email === user.email && other.id !== user.id)).length) {
    throw new EmailTakenError(user.email)
  }
}

class JsonOrgRepository implements OrgRepository {
  constructor(private readonly store: Store) {}

  async findById(id: OrgId) {
    const record = await this.store.get('orgs', id)
    return record ? toOrg(record) : null
  }

  async findBySlug(slug: Slug) {
    const [record] = await this.store.find('orgs', org => org.slug === slug)
    return record ? toOrg(record) : null
  }

  async findBySlugOrPrevious(slug: Slug) {
    const [record] = await this.store.find('orgs', org => org.slug === slug || org.previousSlugs.includes(slug))
    return record ? toOrg(record) : null
  }

  async list() {
    return (await this.store.find('orgs'))
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
      .map(toOrg)
  }

  create(org: Org) {
    return this.save(org)
  }

  update(org: Org) {
    return this.save(org)
  }

  private save(org: Org) {
    return this.store.transaction(async (tx) => {
      const taken = new Set((await tx.find('orgs', other => other.id !== org.id)).flatMap(other => orgSlugs(toOrg(other))))
      const clash = orgSlugs(org).find(slug => taken.has(slug))
      if (clash) {
        throw new SlugTakenError(clash)
      }
      await tx.put('orgs', { ...org })
    })
  }
}

class JsonWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly store: Store) {}

  async findById(id: WorkspaceId) {
    const record = await this.store.get('workspaces', id)
    return record ? toWorkspace(record) : null
  }

  async findBySlug(orgId: OrgId, slug: Slug) {
    const [record] = await this.store.find('workspaces', workspace => workspace.orgId === orgId && workspace.slug === slug)
    return record ? toWorkspace(record) : null
  }

  async listByOrg(orgId: OrgId) {
    return (await this.store.find('workspaces', workspace => workspace.orgId === orgId))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .map(toWorkspace)
  }

  create(workspace: Workspace) {
    return this.store.transaction(async (tx) => {
      if ((await tx.find('workspaces', other => other.orgId === workspace.orgId && other.slug === workspace.slug)).length) {
        throw new SlugTakenError(workspace.slug)
      }
      await tx.put('workspaces', { ...workspace, createdAt: workspace.createdAt.toISOString() })
    })
  }
}

class JsonMembershipRepository implements MembershipRepository {
  constructor(private readonly store: Store) {}

  async find(orgId: OrgId, userId: UserId) {
    const record = await this.store.get('memberships', membershipId(orgId, userId))
    return record ? toMembership(record) : null
  }

  async listByOrg(orgId: OrgId) {
    return (await this.store.find('memberships', membership => membership.orgId === orgId)).map(toMembership)
  }

  async listByUser(userId: UserId) {
    return (await this.store.find('memberships', membership => membership.userId === userId)).map(toMembership)
  }

  add(membership: Membership) {
    return this.store.transaction(async (tx) => {
      const id = membershipId(membership.orgId, membership.userId)
      if (await tx.get('memberships', id)) {
        throw new AlreadyMemberError('organization')
      }
      await tx.put('memberships', { id, ...membership })
    })
  }

  update(membership: Membership) {
    return this.store.transaction(async (tx) => {
      const id = membershipId(membership.orgId, membership.userId)
      if (await tx.get('memberships', id)) {
        await tx.put('memberships', { id, ...membership })
      }
    })
  }

  async remove(orgId: OrgId, userId: UserId) {
    await this.store.delete('memberships', membershipId(orgId, userId))
  }
}

const toMembership = ({ orgId, userId, role }: TenancyDocuments['memberships']): Membership =>
  ({ orgId: orgId as OrgId, userId: userId as UserId, role })

class JsonWorkspaceMembershipRepository implements WorkspaceMembershipRepository {
  constructor(private readonly store: Store) {}

  async find(workspaceId: WorkspaceId, userId: UserId) {
    const record = await this.store.get('workspaceMembers', workspaceMemberId(workspaceId, userId))
    return record ? toWorkspaceMembership(record) : null
  }

  async listByWorkspace(workspaceId: WorkspaceId) {
    return (await this.store.find('workspaceMembers', member => member.workspaceId === workspaceId)).map(toWorkspaceMembership)
  }

  async listByUser(userId: UserId) {
    return (await this.store.find('workspaceMembers', member => member.userId === userId)).map(toWorkspaceMembership)
  }

  add(membership: WorkspaceMembership) {
    return this.store.transaction(async (tx) => {
      const id = workspaceMemberId(membership.workspaceId, membership.userId)
      if (await tx.get('workspaceMembers', id)) {
        throw new AlreadyMemberError('workspace')
      }
      await tx.put('workspaceMembers', { id, ...membership })
    })
  }

  update(membership: WorkspaceMembership) {
    return this.store.transaction(async (tx) => {
      const id = workspaceMemberId(membership.workspaceId, membership.userId)
      if (await tx.get('workspaceMembers', id)) {
        await tx.put('workspaceMembers', { id, ...membership })
      }
    })
  }

  async remove(workspaceId: WorkspaceId, userId: UserId) {
    await this.store.delete('workspaceMembers', workspaceMemberId(workspaceId, userId))
  }
}

const toWorkspaceMembership = ({ workspaceId, userId, role }: TenancyDocuments['workspaceMembers']): WorkspaceMembership =>
  ({ workspaceId: workspaceId as WorkspaceId, userId: userId as UserId, role })
