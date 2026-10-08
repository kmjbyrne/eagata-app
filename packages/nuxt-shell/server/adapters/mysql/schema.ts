import { ORG_ROLES, PLATFORM_ROLES, WORKSPACE_ROLES } from '@kmjbyrne/core'
import { type AnyColumn, sql } from 'drizzle-orm'
import { boolean, check, customType, datetime, index, int, mysqlTable, primaryKey, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'

// The tables behind core's repositories. Each app lists this file in its
// drizzle.config.ts next to its own schema, and owns the migrations.

const now = sql`CURRENT_TIMESTAMP(3)`

/**
 * Refuses a role core doesn't know, even from code that skips core. Built from
 * core's role lists, so changing one changes the constraint, and
 * `pnpm db:generate` makes the migration.
 */
const oneOf = (column: AnyColumn, values: readonly string[]) =>
  sql`${column} IN (${sql.raw(values.map(value => `'${value}'`).join(', '))})`

/**
 * A varchar compared byte for byte. MariaDB's default collation is accent and
 * case insensitive, so it would find `john@corp.com` for `jöhn@corp.com`, and
 * an identity for a subject that differs only in case. Core lowercases emails
 * before they get here, so exact comparison is the right one.
 */
const exactVarchar = customType<{ data: string, config: { length: number } }>({
  dataType: config => `varchar(${config!.length}) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`
})

export const users = mysqlTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  email: exactVarchar('email', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 2048 }),
  deactivatedAt: datetime('deactivated_at', { fsp: 3 }),
  sessionVersion: int('session_version').notNull().default(0),
  createdAt: datetime('created_at', { fsp: 3 }).notNull().default(now)
}, table => [
  uniqueIndex('users_email_unique').on(table.email)
])

/**
 * The few users with a platform role, one row each, with who granted it and
 * when. `granted_by` is null when granted from the command line, or once the
 * granting user is gone.
 */
export const platformRoles = mysqlTable('platform_roles', {
  userId: varchar('user_id', { length: 64 }).primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 32 }).notNull(),
  grantedAt: datetime('granted_at', { fsp: 3 }).notNull(),
  grantedBy: varchar('granted_by', { length: 64 }).references(() => users.id, { onDelete: 'set null' })
}, table => [
  check('platform_roles_role_check', oneOf(table.role, PLATFORM_ROLES))
])

/** A provider account belongs to one user, so (provider, subject) is the key. */
export const userIdentities = mysqlTable('user_identities', {
  provider: exactVarchar('provider', { length: 64 }).notNull(),
  subject: exactVarchar('subject', { length: 191 }).notNull(),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: datetime('created_at', { fsp: 3 }).notNull().default(now)
}, table => [
  primaryKey({ name: 'user_identities_pk', columns: [table.provider, table.subject] }),
  index('user_identities_user_idx').on(table.userId)
])

export const orgs = mysqlTable('orgs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  isPersonal: boolean('is_personal').notNull().default(false),
  createdAt: datetime('created_at', { fsp: 3 }).notNull().default(now)
})

/**
 * Every slug an org has used, current or previous, in one table. The primary
 * key makes a slug belong to one org forever, so an old link can never lead
 * to a different org.
 */
export const orgSlugs = mysqlTable('org_slugs', {
  slug: varchar('slug', { length: 32 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  isCurrent: boolean('is_current').notNull(),
  /** Order of previous slugs, oldest first. */
  position: int('position').notNull().default(0)
}, table => [
  index('org_slugs_org_idx').on(table.orgId)
])

export const workspaces = mysqlTable('workspaces', {
  id: varchar('id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 32 }).notNull(),
  createdAt: datetime('created_at', { fsp: 3 }).notNull().default(now)
}, table => [
  uniqueIndex('workspaces_org_slug_unique').on(table.orgId, table.slug)
])

export const orgMemberships = mysqlTable('org_memberships', {
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 16 }).notNull(),
  createdAt: datetime('created_at', { fsp: 3 }).notNull().default(now)
}, table => [
  primaryKey({ name: 'org_memberships_pk', columns: [table.orgId, table.userId] }),
  index('org_memberships_user_idx').on(table.userId),
  check('org_memberships_role_check', oneOf(table.role, ORG_ROLES))
])

export const workspaceMemberships = mysqlTable('workspace_memberships', {
  workspaceId: varchar('workspace_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 16 }).notNull(),
  createdAt: datetime('created_at', { fsp: 3 }).notNull().default(now)
}, table => [
  primaryKey({ name: 'workspace_memberships_pk', columns: [table.workspaceId, table.userId] }),
  index('workspace_memberships_user_idx').on(table.userId),
  check('workspace_memberships_role_check', oneOf(table.role, WORKSPACE_ROLES))
])

/**
 * Workspace invitations by email, until they become memberships. An email may
 * have no account yet, so it isn't a foreign key.
 */
export const workspaceInvitations = mysqlTable('workspace_invitations', {
  workspaceId: varchar('workspace_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  email: exactVarchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 16 }).notNull(),
  invitedBy: varchar('invited_by', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: datetime('created_at', { fsp: 3 }).notNull()
}, table => [
  primaryKey({ name: 'workspace_invitations_pk', columns: [table.workspaceId, table.email] }),
  index('workspace_invitations_email_idx').on(table.email),
  check('workspace_invitations_role_check', oneOf(table.role, WORKSPACE_ROLES))
])

/**
 * The flagged features each org has switched on: a row means on. The feature
 * is a name from the app's catalog, with no CHECK, so adding or retiring a
 * flag needs no migration.
 */
export const orgFeatures = mysqlTable('org_features', {
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  feature: varchar('feature', { length: 64 }).notNull(),
  enabledAt: datetime('enabled_at', { fsp: 3 }).notNull(),
  enabledBy: varchar('enabled_by', { length: 64 }).references(() => users.id, { onDelete: 'set null' })
}, table => [
  primaryKey({ name: 'org_features_pk', columns: [table.orgId, table.feature] })
])
