import type { UserId } from '@kmjbyrne/core'
import type { PasswordRepository } from '@kmjbyrne/core/passwords'
import type { Database } from '@kmjbyrne/nuxt-shell/mysql'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { passwordResetTokens, userCredentials } from './schema'

export class MysqlPasswordRepository implements PasswordRepository {
  constructor(private readonly db: Database) {}

  async findHash(userId: UserId) {
    const [row] = await this.db.select({ hash: userCredentials.passwordHash }).from(userCredentials).where(eq(userCredentials.userId, userId))
    return row?.hash ?? null
  }

  async setHash(userId: UserId, hash: string, at: Date) {
    await this.db.insert(userCredentials).values({ userId, passwordHash: hash, updatedAt: at })
      .onDuplicateKeyUpdate({ set: { passwordHash: hash, updatedAt: at } })
  }

  async createReset(input: { userId: UserId, tokenHash: string, expiresAt: Date }) {
    await this.db.insert(passwordResetTokens).values(input)
  }

  async consumeReset(tokenHash: string, at: Date) {
    // One conditional update, so two requests can't both spend the token.
    const [result] = await this.db.update(passwordResetTokens).set({ usedAt: at })
      .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, at)))
    if (result.affectedRows !== 1) {
      return null
    }
    const [row] = await this.db.select({ userId: passwordResetTokens.userId }).from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash))
    return (row?.userId ?? null) as UserId | null
  }

  async revokeResets(userId: UserId, at: Date) {
    await this.db.update(passwordResetTokens).set({ usedAt: at })
      .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)))
  }
}
