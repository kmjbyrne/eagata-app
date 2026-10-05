import { schema as shell } from '@kmjbyrne/nuxt-shell/mysql'
import { char, datetime, index, mysqlTable, varchar } from 'drizzle-orm/mysql-core'

// The tables behind passwords, apart from `users` so an app without passwords
// has none of them. An app lists this file in its drizzle.config.ts.

export const userCredentials = mysqlTable('user_credentials', {
  userId: varchar('user_id', { length: 64 }).primaryKey().references(() => shell.users.id, { onDelete: 'cascade' }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  updatedAt: datetime('updated_at', { fsp: 3 }).notNull()
})

/** Reset and invite links. Only a SHA-256 of each token is kept. */
export const passwordResetTokens = mysqlTable('password_reset_tokens', {
  tokenHash: char('token_hash', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => shell.users.id, { onDelete: 'cascade' }),
  expiresAt: datetime('expires_at', { fsp: 3 }).notNull(),
  usedAt: datetime('used_at', { fsp: 3 })
}, table => [
  index('password_reset_tokens_user_idx').on(table.userId)
])
