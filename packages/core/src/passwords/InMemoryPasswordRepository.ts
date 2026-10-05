import type { UserId } from '../values/Ids'
import type { PasswordHasher, PasswordRepository } from './ports'

interface Reset {
  userId: UserId
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
}

export class InMemoryPasswordRepository implements PasswordRepository {
  private readonly hashes = new Map<UserId, string>()
  private readonly resets: Reset[] = []

  async findHash(userId: UserId) {
    return this.hashes.get(userId) ?? null
  }

  async setHash(userId: UserId, hash: string, _at: Date) {
    this.hashes.set(userId, hash)
  }

  async createReset(input: { userId: UserId, tokenHash: string, expiresAt: Date }) {
    this.resets.push({ ...input, usedAt: null })
  }

  async consumeReset(tokenHash: string, at: Date) {
    const reset = this.resets.find(entry => entry.tokenHash === tokenHash && !entry.usedAt && entry.expiresAt > at)
    if (!reset) {
      return null
    }
    reset.usedAt = at
    return reset.userId
  }

  async revokeResets(userId: UserId, at: Date) {
    for (const reset of this.resets) {
      if (reset.userId === userId && !reset.usedAt) {
        reset.usedAt = at
      }
    }
  }
}

/** Stores passwords barely disguised, so tests run fast. Never use outside tests. */
export class PlainPasswordHasher implements PasswordHasher {
  async hash(password: string) {
    return `plain:${password}`
  }

  async verify(password: string, stored: string) {
    return stored === `plain:${password}`
  }
}
