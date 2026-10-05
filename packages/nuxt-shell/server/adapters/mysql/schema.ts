import { sql } from 'drizzle-orm'
import { boolean, datetime, index, int, mysqlTable, primaryKey, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'

// The tables behind core's repositories. Each app lists this file in its
// drizzle.config.ts next to its own schema, and owns the migrations.

const now = sql`CURRENT_TIMESTAMP(3)`

export const users = mysqlTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 2048 }),
  isPlatformAdmin: boolean('is_platform_admin').notNull().default(false),
  createdAt: datetime('created_at', { fsp: 3 }).notNull().default(now)
}, table => [
  uniqueIndex('users_email_unique').on(table.email)
])

/** A provider account belongs to one user, so (provider, subject) is the key. */
export const userIdentities = mysqlTable('user_identities', {
  provider: varchar('provider', { length: 64 }).notNull(),
  subject: varchar('subject', { length: 191 }).notNull(),
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
  index('org_memberships_user_idx').on(table.userId)
])

export const workspaceMemberships = mysqlTable('workspace_memberships', {
  workspaceId: varchar('workspace_id', { length: 64 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 16 }).notNull(),
  createdAt: datetime('created_at', { fsp: 3 }).notNull().default(now)
}, table => [
  primaryKey({ name: 'workspace_memberships_pk', columns: [table.workspaceId, table.userId] }),
  index('workspace_memberships_user_idx').on(table.userId)
])
