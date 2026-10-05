import { schema as shell } from '@kmjbyrne/nuxt-shell/mysql'
import { boolean, check, datetime, index, mediumtext, mysqlTable, varchar } from 'drizzle-orm/mysql-core'
import { sql } from 'drizzle-orm'
import { FEEDBACK_KINDS, FEEDBACK_STATUSES } from '@kmjbyrne/core/feedback'

// The tables behind feedback. An app lists this file in its drizzle.config.ts.

const oneOf = (column: Parameters<typeof sql>[1], values: readonly string[]) =>
  sql`${column} IN (${sql.raw(values.map(value => `'${value}'`).join(', '))})`

export const feedback = mysqlTable('feedback', {
  id: varchar('id', { length: 64 }).primaryKey(),
  workspaceId: varchar('workspace_id', { length: 64 }).notNull().references(() => shell.workspaces.id, { onDelete: 'cascade' }),
  authorId: varchar('author_id', { length: 64 }).notNull().references(() => shell.users.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 16 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  body: mediumtext('body').notNull(),
  pagePath: varchar('page_path', { length: 2048 }),
  status: varchar('status', { length: 16 }).notNull(),
  createdAt: datetime('created_at', { fsp: 3 }).notNull(),
  updatedAt: datetime('updated_at', { fsp: 3 }).notNull()
}, table => [
  index('feedback_author_idx').on(table.workspaceId, table.authorId),
  index('feedback_updated_idx').on(table.updatedAt),
  check('feedback_kind_check', oneOf(table.kind, FEEDBACK_KINDS)),
  check('feedback_status_check', oneOf(table.status, FEEDBACK_STATUSES))
])

export const feedbackReplies = mysqlTable('feedback_replies', {
  id: varchar('id', { length: 64 }).primaryKey(),
  feedbackId: varchar('feedback_id', { length: 64 }).notNull().references(() => feedback.id, { onDelete: 'cascade' }),
  authorId: varchar('author_id', { length: 64 }).notNull().references(() => shell.users.id, { onDelete: 'cascade' }),
  fromPlatform: boolean('from_platform').notNull(),
  body: mediumtext('body').notNull(),
  createdAt: datetime('created_at', { fsp: 3 }).notNull()
}, table => [
  index('feedback_replies_feedback_idx').on(table.feedbackId, table.createdAt)
])
