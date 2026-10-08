import {
  AlreadyMemberError,
  EmailTakenError,
  IdentityInUseError,
  SlugTakenError,
  type Email,
  type Membership,
  type MembershipRepository,
  type Name,
  type Org,
  type OrgId,
  type OrgRepository,
  type OrgRole,
  type Repositories,
  type Slug,
  type User,
  type UserId,
  type LinkedIdentity,
  PLATFORM_ROLES,
  type PlatformRole,
  type PlatformRoleGrant,
  type UserIdentity,
  type UserRepository,
  type Workspace,
  type WorkspaceId,
  type WorkspaceMembership,
  type WorkspaceInvitation,
  type OrgFeature,
  type OrgFeatureRepository,
  type WorkspaceInvitationRepository,
  type WorkspaceMembershipRepository,
  type WorkspaceRepository,
  type WorkspaceRole
} from '@kmjbyrne/core'
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/mysql2'
import * as schema from './schema'

export function createDatabase(url: string) {
  return drizzle({ connection: { uri: url }, schema, mode: 'default' })
}

/** A Drizzle database on a mysql2 pool, which `$client` exposes. */
export type Database = ReturnType<typeof createDatabase>
type Executor = Pick<Database, 'select' | 'insert' | 'update' | 'delete'>

/**
 * Core's repositories on MariaDB or MySQL. Inside a transaction, reads that
 * rules depend on (owners, platform admins) lock their rows, so two requests
 * can't both remove the last owner.
 */
export class MysqlRepositories implements Repositories {
  readonly users: UserRepository
  readonly orgs: OrgRepository
  readonly workspaces: WorkspaceRepository
  readonly memberships: MembershipRepository
  readonly workspaceMembers: WorkspaceMembershipRepository
  readonly invitations: WorkspaceInvitationRepository
  readonly orgFeatures: OrgFeatureRepository

  constructor(private readonly db: Database, private readonly executor: Executor = db, private readonly inTransaction = false) {
    const atomically = <R>(fn: (executor: Executor) => Promise<R>) =>
      inTransaction ? fn(executor) : db.transaction(tx => fn(tx))
    this.users = new MysqlUserRepository(executor, inTransaction)
    this.orgs = new MysqlOrgRepository(executor, atomically)
    this.workspaces = new MysqlWorkspaceRepository(executor)
    this.memberships = new MysqlMembershipRepository(executor, inTransaction)
    this.workspaceMembers = new MysqlWorkspaceMembershipRepository(executor, inTransaction)
    this.invitations = new MysqlInvitationRepository(executor)
    this.orgFeatures = new MysqlOrgFeatureRepository(executor)
  }

  transaction<R>(fn: (tx: Repositories) => Promise<R>): Promise<R> {
    if (this.inTransaction) {
      return fn(this)
    }
    return this.db.transaction(tx => fn(new MysqlRepositories(this.db, tx, true)))
  }
}

/** The key a duplicate-key error names, or null for any other error. Drizzle wraps the driver's error. */
function duplicateEntry(error: unknown): string | null {
  for (let current = error as { code?: string, errno?: number, sqlMessage?: string, message?: string, cause?: unknown } | undefined; current; current = current.cause as typeof current) {
    if (current.code === 'ER_DUP_ENTRY' || current.errno === 1062) {
      return current.sqlMessage ?? current.message ?? ''
    }
  }
  return null
}

async function mapDuplicate<R>(work: () => Promise<R>, toError: (message: string) => Error): Promise<R> {
  try {
    return await work()
  } catch (error) {
    const message = duplicateEntry(error)
    throw message === null ? error : toError(message)
  }
}

const duplicatedValue = (message: string) => /Duplicate entry '([^']*)'/.exec(message)?.[1] ?? ''

function toGrant(row: typeof schema.platformRoles.$inferSelect | undefined): PlatformRoleGrant | null {
  if (!row) {
    return null
  }
  if (!PLATFORM_ROLES.includes(row.role as PlatformRole)) {
    throw new Error(`Unknown platform role "${row.role}" for user ${row.userId}`)
  }
  return { role: row.role as PlatformRole, grantedAt: row.grantedAt, grantedBy: row.grantedBy as UserId | null }
}

class MysqlUserRepository implements UserRepository {
  constructor(private readonly db: Executor, private readonly lock: boolean) {}

  async findById(id: UserId) {
    return (await this.load(eq(schema.users.id, id)))[0] ?? null
  }

  async findByEmail(email: Email) {
    return (await this.load(eq(schema.users.email, email)))[0] ?? null
  }

  async findByIdentity(identity: UserIdentity) {
    const [row] = await this.db.select({ userId: schema.userIdentities.userId }).from(schema.userIdentities)
      .where(and(eq(schema.userIdentities.provider, identity.provider), eq(schema.userIdentities.subject, identity.subject)))
    return row ? this.findById(row.userId as UserId) : null
  }

  async list() {
    return this.load()
  }

  async countPlatformAdmins() {
    const query = this.db.select({ id: schema.users.id }).from(schema.platformRoles)
      .innerJoin(schema.users, eq(schema.users.id, schema.platformRoles.userId))
      .where(and(eq(schema.platformRoles.role, 'admin'), isNull(schema.users.deactivatedAt)))
    return (await (this.lock ? query.for('update') : query)).length
  }

  async create(user: User) {
    await mapDuplicate(async () => {
      await this.db.insert(schema.users).values({
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        deactivatedAt: user.deactivatedAt,
        sessionVersion: user.sessionVersion
      })
    }, () => new EmailTakenError(user.email))
    await this.setPlatformRole(user.id, user.platformRole)
    for (const identity of user.identities) {
      await this.linkIdentity(user.id, identity)
    }
  }

  async update(user: User) {
    await mapDuplicate(() => this.db.update(schema.users).set({
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      deactivatedAt: user.deactivatedAt
    }).where(eq(schema.users.id, user.id)), () => new EmailTakenError(user.email))
  }

  async setPlatformRole(userId: UserId, grant: PlatformRoleGrant | null) {
    await this.db.delete(schema.platformRoles).where(eq(schema.platformRoles.userId, userId))
    if (grant) {
      await this.db.insert(schema.platformRoles).values({ userId, ...grant })
    }
  }

  async linkIdentity(userId: UserId, identity: LinkedIdentity) {
    const owner = await this.findByIdentity(identity)
    if (owner?.id === userId) {
      return
    }
    if (owner) {
      throw new IdentityInUseError(identity.provider)
    }
    await mapDuplicate(
      () => this.db.insert(schema.userIdentities).values({ userId, provider: identity.provider, subject: identity.subject, createdAt: identity.linkedAt }),
      () => new IdentityInUseError(identity.provider)
    )
  }

  async bumpSessionVersion(userId: UserId) {
    await this.db.update(schema.users).set({ sessionVersion: sql`${schema.users.sessionVersion} + 1` }).where(eq(schema.users.id, userId))
    const [row] = await this.db.select({ sessionVersion: schema.users.sessionVersion }).from(schema.users).where(eq(schema.users.id, userId))
    if (!row) {
      throw new Error(`No user ${userId}`)
    }
    return row.sessionVersion
  }

  private async load(where?: ReturnType<typeof eq>): Promise<User[]> {
    const rows = await this.db.select().from(schema.users).where(where).orderBy(asc(schema.users.displayName), asc(schema.users.id))
    if (!rows.length) {
      return []
    }
    const ids = rows.map(row => row.id)
    const roles = await this.db.select().from(schema.platformRoles).where(inArray(schema.platformRoles.userId, ids))
    const identities = await this.db.select().from(schema.userIdentities)
      .where(inArray(schema.userIdentities.userId, ids))
      .orderBy(asc(schema.userIdentities.createdAt))
    return rows.map(row => ({
      id: row.id as UserId,
      displayName: row.displayName as Name,
      email: row.email as Email,
      avatarUrl: row.avatarUrl,
      platformRole: toGrant(roles.find(role => role.userId === row.id)),
      deactivatedAt: row.deactivatedAt,
      sessionVersion: row.sessionVersion,
      identities: identities.filter(identity => identity.userId === row.id)
        .map(identity => ({ provider: identity.provider, subject: identity.subject, linkedAt: identity.createdAt }))
    }))
  }
}

class MysqlOrgRepository implements OrgRepository {
  constructor(
    private readonly db: Executor,
    private readonly atomically: <R>(fn: (executor: Executor) => Promise<R>) => Promise<R>
  ) {}

  async findById(id: OrgId) {
    return (await this.load([id]))[0] ?? null
  }

  async findBySlug(slug: Slug) {
    const [row] = await this.db.select({ orgId: schema.orgSlugs.orgId }).from(schema.orgSlugs)
      .where(and(eq(schema.orgSlugs.slug, slug), eq(schema.orgSlugs.isCurrent, true)))
    return row ? this.findById(row.orgId as OrgId) : null
  }

  async findBySlugOrPrevious(slug: Slug) {
    const [row] = await this.db.select({ orgId: schema.orgSlugs.orgId }).from(schema.orgSlugs).where(eq(schema.orgSlugs.slug, slug))
    return row ? this.findById(row.orgId as OrgId) : null
  }

  async list() {
    const rows = await this.db.select({ id: schema.orgs.id }).from(schema.orgs).orderBy(asc(schema.orgs.name), asc(schema.orgs.id))
    return this.load(rows.map(row => row.id as OrgId))
  }

  async create(org: Org) {
    await this.atomically(async (db) => {
      await db.insert(schema.orgs).values({ id: org.id, name: org.name, isPersonal: org.isPersonal })
      await this.insertSlugs(db, org)
    })
  }

  async update(org: Org) {
    await this.atomically(async (db) => {
      await db.update(schema.orgs).set({ name: org.name, isPersonal: org.isPersonal }).where(eq(schema.orgs.id, org.id))
      await db.delete(schema.orgSlugs).where(eq(schema.orgSlugs.orgId, org.id))
      await this.insertSlugs(db, org)
    })
  }

  private insertSlugs(db: Executor, org: Org) {
    return mapDuplicate(() => db.insert(schema.orgSlugs).values([
      { slug: org.slug, orgId: org.id, isCurrent: true, position: 0 },
      ...org.previousSlugs.map((slug, index) => ({ slug, orgId: org.id, isCurrent: false, position: index }))
    ]), message => new SlugTakenError(duplicatedValue(message)))
  }

  /** Orgs with their slugs, in the order of `ids`. */
  private async load(ids: OrgId[]): Promise<Org[]> {
    if (!ids.length) {
      return []
    }
    const rows = await this.db.select().from(schema.orgs).where(inArray(schema.orgs.id, ids))
    const slugs = await this.db.select().from(schema.orgSlugs).where(inArray(schema.orgSlugs.orgId, ids)).orderBy(asc(schema.orgSlugs.position))
    return ids.flatMap((id) => {
      const row = rows.find(candidate => candidate.id === id)
      const own = slugs.filter(slug => slug.orgId === id)
      const current = own.find(slug => slug.isCurrent)
      return row && current
        ? [{
            id: row.id as OrgId,
            name: row.name as Name,
            slug: current.slug as Slug,
            previousSlugs: own.filter(slug => !slug.isCurrent).map(slug => slug.slug as Slug),
            isPersonal: row.isPersonal
          }]
        : []
    })
  }
}

const toWorkspace = (row: typeof schema.workspaces.$inferSelect): Workspace => ({
  id: row.id as WorkspaceId,
  orgId: row.orgId as OrgId,
  name: row.name as Name,
  slug: row.slug as Slug,
  createdAt: row.createdAt
})

class MysqlWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly db: Executor) {}

  async findById(id: WorkspaceId) {
    const [row] = await this.db.select().from(schema.workspaces).where(eq(schema.workspaces.id, id))
    return row ? toWorkspace(row) : null
  }

  async findBySlug(orgId: OrgId, slug: Slug) {
    const [row] = await this.db.select().from(schema.workspaces).where(and(eq(schema.workspaces.orgId, orgId), eq(schema.workspaces.slug, slug)))
    return row ? toWorkspace(row) : null
  }

  async listByOrg(orgId: OrgId) {
    const rows = await this.db.select().from(schema.workspaces).where(eq(schema.workspaces.orgId, orgId))
      .orderBy(asc(schema.workspaces.createdAt), asc(schema.workspaces.id))
    return rows.map(toWorkspace)
  }

  async create(workspace: Workspace) {
    await mapDuplicate(() => this.db.insert(schema.workspaces).values({
      id: workspace.id,
      orgId: workspace.orgId,
      name: workspace.name,
      slug: workspace.slug,
      createdAt: workspace.createdAt
    }), () => new SlugTakenError(workspace.slug))
  }
}

class MysqlMembershipRepository implements MembershipRepository {
  constructor(private readonly db: Executor, private readonly lock: boolean) {}

  async find(orgId: OrgId, userId: UserId) {
    const [row] = await this.db.select().from(schema.orgMemberships)
      .where(and(eq(schema.orgMemberships.orgId, orgId), eq(schema.orgMemberships.userId, userId)))
    return row ? toMembership(row) : null
  }

  async listByOrg(orgId: OrgId) {
    const query = this.db.select().from(schema.orgMemberships).where(eq(schema.orgMemberships.orgId, orgId)).orderBy(asc(schema.orgMemberships.createdAt))
    return (await (this.lock ? query.for('update') : query)).map(toMembership)
  }

  async listByUser(userId: UserId) {
    return (await this.db.select().from(schema.orgMemberships).where(eq(schema.orgMemberships.userId, userId))
      .orderBy(asc(schema.orgMemberships.createdAt))).map(toMembership)
  }

  async add(membership: Membership) {
    await mapDuplicate(() => this.db.insert(schema.orgMemberships).values(membership), () => new AlreadyMemberError('organization'))
  }

  async update(membership: Membership) {
    await this.db.update(schema.orgMemberships).set({ role: membership.role })
      .where(and(eq(schema.orgMemberships.orgId, membership.orgId), eq(schema.orgMemberships.userId, membership.userId)))
  }

  async remove(orgId: OrgId, userId: UserId) {
    await this.db.delete(schema.orgMemberships).where(and(eq(schema.orgMemberships.orgId, orgId), eq(schema.orgMemberships.userId, userId)))
  }
}

const toMembership = (row: typeof schema.orgMemberships.$inferSelect): Membership =>
  ({ orgId: row.orgId as OrgId, userId: row.userId as UserId, role: row.role as OrgRole })

class MysqlWorkspaceMembershipRepository implements WorkspaceMembershipRepository {
  constructor(private readonly db: Executor, private readonly lock: boolean) {}

  async find(workspaceId: WorkspaceId, userId: UserId) {
    const [row] = await this.db.select().from(schema.workspaceMemberships)
      .where(and(eq(schema.workspaceMemberships.workspaceId, workspaceId), eq(schema.workspaceMemberships.userId, userId)))
    return row ? toWorkspaceMembership(row) : null
  }

  async listByWorkspace(workspaceId: WorkspaceId) {
    const query = this.db.select().from(schema.workspaceMemberships).where(eq(schema.workspaceMemberships.workspaceId, workspaceId))
      .orderBy(asc(schema.workspaceMemberships.createdAt))
    return (await (this.lock ? query.for('update') : query)).map(toWorkspaceMembership)
  }

  async listByUser(userId: UserId) {
    return (await this.db.select().from(schema.workspaceMemberships).where(eq(schema.workspaceMemberships.userId, userId))
      .orderBy(asc(schema.workspaceMemberships.createdAt))).map(toWorkspaceMembership)
  }

  async add(membership: WorkspaceMembership) {
    await mapDuplicate(() => this.db.insert(schema.workspaceMemberships).values(membership), () => new AlreadyMemberError('workspace'))
  }

  async update(membership: WorkspaceMembership) {
    await this.db.update(schema.workspaceMemberships).set({ role: membership.role })
      .where(and(eq(schema.workspaceMemberships.workspaceId, membership.workspaceId), eq(schema.workspaceMemberships.userId, membership.userId)))
  }

  async remove(workspaceId: WorkspaceId, userId: UserId) {
    await this.db.delete(schema.workspaceMemberships)
      .where(and(eq(schema.workspaceMemberships.workspaceId, workspaceId), eq(schema.workspaceMemberships.userId, userId)))
  }
}

const toWorkspaceMembership = (row: typeof schema.workspaceMemberships.$inferSelect): WorkspaceMembership =>
  ({ workspaceId: row.workspaceId as WorkspaceId, userId: row.userId as UserId, role: row.role as WorkspaceRole })

class MysqlInvitationRepository implements WorkspaceInvitationRepository {
  constructor(private readonly db: Executor) {}

  async listByWorkspace(workspaceId: WorkspaceId) {
    const rows = await this.db.select().from(schema.workspaceInvitations)
      .where(eq(schema.workspaceInvitations.workspaceId, workspaceId))
      .orderBy(asc(schema.workspaceInvitations.createdAt))
    return rows.map(toInvitation)
  }

  async listByEmail(email: Email) {
    return (await this.db.select().from(schema.workspaceInvitations).where(eq(schema.workspaceInvitations.email, email))).map(toInvitation)
  }

  async put(invitation: WorkspaceInvitation) {
    await this.db.insert(schema.workspaceInvitations).values(invitation)
      .onDuplicateKeyUpdate({ set: { role: invitation.role, invitedBy: invitation.invitedBy, createdAt: invitation.createdAt } })
  }

  async remove(workspaceId: WorkspaceId, email: Email) {
    await this.db.delete(schema.workspaceInvitations)
      .where(and(eq(schema.workspaceInvitations.workspaceId, workspaceId), eq(schema.workspaceInvitations.email, email)))
  }
}

const toInvitation = (row: typeof schema.workspaceInvitations.$inferSelect): WorkspaceInvitation => ({
  workspaceId: row.workspaceId as WorkspaceId,
  email: row.email as Email,
  role: row.role as WorkspaceRole,
  invitedBy: row.invitedBy as UserId,
  createdAt: row.createdAt
})

class MysqlOrgFeatureRepository implements OrgFeatureRepository {
  constructor(private readonly db: Executor) {}

  async listByOrg(orgId: OrgId) {
    const rows = await this.db.select().from(schema.orgFeatures)
      .where(eq(schema.orgFeatures.orgId, orgId))
      .orderBy(asc(schema.orgFeatures.feature))
    return rows.map((row): OrgFeature => ({ orgId: row.orgId as OrgId, feature: row.feature, enabledAt: row.enabledAt, enabledBy: row.enabledBy as UserId | null }))
  }

  async enable(feature: OrgFeature) {
    await this.db.insert(schema.orgFeatures).values(feature).onDuplicateKeyUpdate({ set: { orgId: sql`org_id` } })
  }

  async disable(orgId: OrgId, feature: string) {
    await this.db.delete(schema.orgFeatures)
      .where(and(eq(schema.orgFeatures.orgId, orgId), eq(schema.orgFeatures.feature, feature)))
  }
}
