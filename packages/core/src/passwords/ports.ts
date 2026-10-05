import type { UserId } from '../values/Ids'

export interface PasswordHasher {
  hash(password: string): Promise<string>
  /** False for a wrong password, or a stored hash this hasher can't read. */
  verify(password: string, stored: string): Promise<boolean>
}

/** Password hashes and reset tokens, kept apart from users so apps without passwords have neither. */
export interface PasswordRepository {
  findHash(userId: UserId): Promise<string | null>
  setHash(userId: UserId, hash: string, at: Date): Promise<void>
  createReset(input: { userId: UserId, tokenHash: string, expiresAt: Date }): Promise<void>
  /**
   * Marks an unused, unexpired token used and returns its user, or null.
   * Atomic, so one token can never set a password twice.
   */
  consumeReset(tokenHash: string, at: Date): Promise<UserId | null>
  /** Marks every unused token of the user used. */
  revokeResets(userId: UserId, at: Date): Promise<void>
}
