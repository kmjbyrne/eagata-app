import type { UserId } from '@kmjbyrne/core'
import type { PasswordRepository } from '@kmjbyrne/core/passwords'
import { defineCollections, type DocumentsOf, type JsonStore } from '@kmjbyrne/json-store'
import { z } from 'zod'

// Dev data for @kmjbyrne/nuxt-passwords, for apps that extend it. Dates are
// ISO strings, as in the tenancy records.

export const credentialRecord = z.object({
  /** The user's id. */
  id: z.string(),
  passwordHash: z.string(),
  updatedAt: z.iso.datetime()
})

export const passwordResetRecord = z.object({
  /** The SHA-256 of the token. */
  id: z.string(),
  userId: z.string(),
  expiresAt: z.iso.datetime(),
  usedAt: z.iso.datetime().nullable()
})

export type CredentialRecord = z.infer<typeof credentialRecord>

/** "sandbox-password", in Werkzeug's format, as the real hasher writes it. */
export const SANDBOX_PASSWORD_HASH = 'pbkdf2:sha256:600000$sandboxFixtures1$671df9c4093e29649c1cb06de0b2f152d6a4589f883cb4da5a9063631252f575'

/**
 * Ada and Grace have the password "sandbox-password", so Google sign-in asks
 * them to confirm it before linking. Everyone else signs in without one.
 */
export function defaultPasswordFixtures(): CredentialRecord[] {
  return ['user-ada', 'user-grace'].map(id => ({ id, passwordHash: SANDBOX_PASSWORD_HASH, updatedAt: '2026-01-01T00:00:00.000Z' }))
}

export function passwordCollections(credentials: CredentialRecord[] = defaultPasswordFixtures()) {
  return defineCollections({
    credentials: { schema: credentialRecord, seed: () => credentials },
    passwordResets: { schema: passwordResetRecord, seed: () => [] }
  })
}

export type PasswordDocuments = DocumentsOf<ReturnType<typeof passwordCollections>>

export class JsonPasswordRepository implements PasswordRepository {
  constructor(private readonly store: JsonStore<PasswordDocuments>) {}

  async findHash(userId: UserId) {
    return (await this.store.get('credentials', userId))?.passwordHash ?? null
  }

  async setHash(userId: UserId, hash: string, at: Date) {
    await this.store.put('credentials', { id: userId, passwordHash: hash, updatedAt: at.toISOString() })
  }

  async createReset(input: { userId: UserId, tokenHash: string, expiresAt: Date }) {
    await this.store.put('passwordResets', { id: input.tokenHash, userId: input.userId, expiresAt: input.expiresAt.toISOString(), usedAt: null })
  }

  consumeReset(tokenHash: string, at: Date) {
    return this.store.transaction(async (tx) => {
      const reset = await tx.get('passwordResets', tokenHash)
      if (!reset || reset.usedAt || new Date(reset.expiresAt) <= at) {
        return null
      }
      await tx.put('passwordResets', { ...reset, usedAt: at.toISOString() })
      return reset.userId as UserId
    })
  }

  revokeResets(userId: UserId, at: Date) {
    return this.store.transaction(async (tx) => {
      for (const reset of await tx.find('passwordResets', entry => entry.userId === userId && !entry.usedAt)) {
        await tx.put('passwordResets', { ...reset, usedAt: at.toISOString() })
      }
    })
  }
}
