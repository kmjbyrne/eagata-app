import { describe, expect, it } from 'vitest'
import type { UserId } from '../values/Ids'
import type { PasswordRepository } from '../passwords/ports'

let sequence = 0
const id = () => `pw-${Date.now().toString(36)}-${++sequence}` as UserId

/**
 * The behaviour every `PasswordRepository` shares. `createUser` stores a user
 * the repository can refer to, for stores with foreign keys.
 */
export function passwordRepositoryContract(createRepository: () => Promise<PasswordRepository> | PasswordRepository, createUser: (id: UserId) => Promise<void> = async () => {}) {
  async function setup() {
    const passwords = await createRepository()
    const userId = id()
    await createUser(userId)
    return { passwords, userId }
  }

  const at = new Date('2026-06-01T12:00:00.000Z')
  const later = (ms: number) => new Date(at.getTime() + ms)

  describe('PasswordRepository contract', () => {
    it('stores and replaces a hash', async () => {
      const { passwords, userId } = await setup()
      expect(await passwords.findHash(userId)).toBeNull()

      await passwords.setHash(userId, 'first', at)
      await passwords.setHash(userId, 'second', later(1))
      expect(await passwords.findHash(userId)).toBe('second')
    })

    it('consumes a reset once, and only before it expires', async () => {
      const { passwords, userId } = await setup()
      await passwords.createReset({ userId, tokenHash: `once-${userId}`, expiresAt: later(60_000) })
      await passwords.createReset({ userId, tokenHash: `stale-${userId}`, expiresAt: later(60_000) })

      expect(await passwords.consumeReset(`once-${userId}`, at)).toBe(userId)
      expect(await passwords.consumeReset(`once-${userId}`, at)).toBeNull()
      expect(await passwords.consumeReset(`stale-${userId}`, later(60_000))).toBeNull()
      expect(await passwords.consumeReset('unknown', at)).toBeNull()
    })

    it('revokes every unused reset of a user', async () => {
      const { passwords, userId } = await setup()
      await passwords.createReset({ userId, tokenHash: `revoked-${userId}`, expiresAt: later(60_000) })
      await passwords.revokeResets(userId, at)

      expect(await passwords.consumeReset(`revoked-${userId}`, at)).toBeNull()
    })
  })
}
