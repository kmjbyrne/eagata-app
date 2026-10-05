import { createHash, randomBytes } from 'node:crypto'
import { isActive, type User } from '../entities/User'
import { AccountDeactivatedError, IdentityMismatchError, NotFoundError } from '../errors'
import type { CurrentUser } from '../ports/CurrentUser'
import type { EmailSender } from '../ports/EmailSender'
import type { LinkProof } from '../ports/LinkProof'
import { TooManyAttemptsError, type RateLimiter, type RateRule } from '../ports/RateLimiter'
import type { Repositories } from '../ports/Repositories'
import { requireUser } from '../services/access'
import type { PendingLink } from '../services/AuthService'
import { requirePlatformAdmin } from '../services/platform'
import { parseEmail, type Email } from '../values/Email'
import type { UserId } from '../values/Ids'
import { inviteEmail, resetEmail } from './emails'
import { InvalidCredentialsError, InvalidResetTokenError, WrongPasswordError } from './errors'
import { parsePassword } from './Password'
import type { PasswordHasher, PasswordRepository } from './ports'

/** Failed password checks per account, across sign-in, linking and changing it. */
export const PASSWORD_ATTEMPTS: RateRule = { limit: 5, windowMs: 15 * 60 * 1000 }

/** Reset emails per address, so the form can't be used to flood an inbox. */
export const RESET_EMAILS: RateRule = { limit: 3, windowMs: 60 * 60 * 1000 }

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000

/** Longer than a reset: someone new may not read their email for a day or two. */
export const INVITE_TOKEN_TTL_MS = 72 * 60 * 60 * 1000

export const passwordKey = (email: Email) => `password:${email}`

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export interface PasswordAdapters {
  repositories: Repositories
  passwords: PasswordRepository
  hasher: PasswordHasher
  mail: EmailSender
  limiter: RateLimiter
  currentUser: CurrentUser
  now?: () => Date
}

/**
 * Passwords, as a second way in beside the sign-in provider. Optional: an app
 * that doesn't build this has no passwords at all.
 */
export class PasswordService {
  // Unknown emails still pay for a hash check, so response time doesn't
  // reveal which emails have accounts.
  private dummyHash?: Promise<string>
  private readonly now: () => Date

  constructor(private readonly adapters: PasswordAdapters) {
    this.now = adapters.now ?? (() => new Date())
  }

  /**
   * @throws InvalidCredentialsError for an unknown email or a wrong password, alike
   * @throws AccountDeactivatedError, only once the password is right
   * @throws TooManyAttemptsError
   */
  async signIn(emailInput: string, password: string): Promise<User> {
    const email = parseEmail(emailInput)
    await this.requireUnderLimit(email)
    const user = await this.adapters.repositories.users.findByEmail(email)
    if (!(await this.check(user, password)) || !user) {
      await this.adapters.limiter.hit(passwordKey(email), PASSWORD_ATTEMPTS)
      throw new InvalidCredentialsError()
    }
    await this.adapters.limiter.reset(passwordKey(email))
    if (!isActive(user)) {
      throw new AccountDeactivatedError()
    }
    return user
  }

  /**
   * Links the provider account that sign-in matched by email, once the user
   * proves the account is theirs with its password.
   * @throws InvalidCredentialsError
   * @throws TooManyAttemptsError
   * @throws IdentityMismatchError if another account at the provider was linked meanwhile
   */
  async linkIdentity(pending: PendingLink, password: string): Promise<User> {
    const user = await this.adapters.repositories.users.findById(pending.userId)
    if (!user) {
      throw new InvalidCredentialsError()
    }
    await this.requireUnderLimit(user.email)
    if (!(await this.check(user, password))) {
      await this.adapters.limiter.hit(passwordKey(user.email), PASSWORD_ATTEMPTS)
      throw new InvalidCredentialsError()
    }
    await this.adapters.limiter.reset(passwordKey(user.email))
    if (!isActive(user)) {
      throw new AccountDeactivatedError()
    }
    return this.adapters.repositories.transaction(async (tx) => {
      const current = (await tx.users.findById(user.id))!
      if (current.identities.some(own => own.provider === pending.identity.provider && own.subject !== pending.identity.subject)) {
        throw new IdentityMismatchError(pending.identity.provider)
      }
      const link = { ...pending.identity, linkedAt: this.now() }
      await tx.users.linkIdentity(user.id, link)
      const updated = { ...current, avatarUrl: pending.picture, identities: [...current.identities.filter(own => own.provider !== link.provider), link] }
      await tx.users.update(updated)
      return updated
    })
  }

  /** Whether the signed-in user has a password. @throws NotSignedInError */
  async hasPassword(): Promise<boolean> {
    const user = await requireUser(this.adapters.repositories, this.adapters.currentUser)
    return (await this.adapters.passwords.findHash(user.id)) !== null
  }

  /**
   * Sets the signed-in user's password. One they already have must be
   * confirmed first. Any reset links stop working.
   * @throws InvalidPasswordError
   * @throws WrongPasswordError
   * @throws TooManyAttemptsError
   */
  async setPassword(input: { current?: string, password: string }): Promise<void> {
    const user = await requireUser(this.adapters.repositories, this.adapters.currentUser)
    const password = parsePassword(input.password)
    const stored = await this.adapters.passwords.findHash(user.id)
    if (stored) {
      await this.requireUnderLimit(user.email)
      if (!(await this.adapters.hasher.verify(input.current ?? '', stored))) {
        await this.adapters.limiter.hit(passwordKey(user.email), PASSWORD_ATTEMPTS)
        throw new WrongPasswordError()
      }
      await this.adapters.limiter.reset(passwordKey(user.email))
    }
    await this.save(user.id, password)
  }

  /**
   * Emails a reset link when the email belongs to an active user. Says
   * nothing either way, so callers can't learn which emails have accounts.
   * Also lets someone with no password, such as a Google-only user, set one.
   */
  async requestReset(emailInput: string, resetUrl: (token: string) => string): Promise<void> {
    const email = parseEmail(emailInput)
    const key = `reset:${email}`
    if (await this.adapters.limiter.retryAfter(key, RESET_EMAILS) > 0) {
      return
    }
    await this.adapters.limiter.hit(key, RESET_EMAILS)
    const user = await this.adapters.repositories.users.findByEmail(email)
    if (!user || !isActive(user)) {
      return
    }
    const token = await this.issueToken(user.id, RESET_TOKEN_TTL_MS)
    await this.adapters.mail.send(resetEmail(user.email, user.displayName, resetUrl(token), RESET_TOKEN_TTL_MS / 60_000))
  }

  /**
   * Emails a user a link to choose their password, for a platform admin
   * setting them up.
   * @throws ForbiddenError unless the signed-in user is a platform admin
   * @throws AccountDeactivatedError
   */
  async sendInvite(userId: UserId, inviteUrl: (token: string) => string): Promise<void> {
    await requirePlatformAdmin(this.adapters.repositories, this.adapters.currentUser)
    const user = await this.adapters.repositories.users.findById(userId)
    if (!user) {
      throw new NotFoundError('User not found')
    }
    if (!isActive(user)) {
      throw new AccountDeactivatedError()
    }
    const token = await this.issueToken(user.id, INVITE_TOKEN_TTL_MS)
    await this.adapters.mail.send(inviteEmail(user.email, user.displayName, inviteUrl(token), INVITE_TOKEN_TTL_MS / 3_600_000))
  }

  /** @throws InvalidPasswordError, before the token is spent @throws InvalidResetTokenError */
  async resetPassword(token: string, passwordInput: string): Promise<User> {
    const password = parsePassword(passwordInput)
    const userId = await this.adapters.passwords.consumeReset(hashResetToken(token), this.now())
    const user = userId ? await this.adapters.repositories.users.findById(userId) : null
    if (!user || !isActive(user)) {
      throw new InvalidResetTokenError()
    }
    await this.save(user.id, password)
    await this.adapters.limiter.reset(passwordKey(user.email))
    return user
  }

  /** Makes Google sign-in ask for the password before linking, for users who have one. */
  linkProof(): LinkProof {
    return { requiredFor: async userId => (await this.adapters.passwords.findHash(userId)) !== null }
  }

  private async save(userId: UserId, password: string): Promise<void> {
    const now = this.now()
    await this.adapters.passwords.setHash(userId, await this.adapters.hasher.hash(password), now)
    await this.adapters.passwords.revokeResets(userId, now)
  }

  private async issueToken(userId: UserId, ttlMs: number): Promise<string> {
    const now = this.now()
    const token = randomBytes(32).toString('base64url')
    await this.adapters.passwords.revokeResets(userId, now)
    await this.adapters.passwords.createReset({ userId, tokenHash: hashResetToken(token), expiresAt: new Date(now.getTime() + ttlMs) })
    return token
  }

  private async check(user: User | null, password: string): Promise<boolean> {
    const stored = user ? await this.adapters.passwords.findHash(user.id) : null
    if (!stored) {
      this.dummyHash ??= this.adapters.hasher.hash('dummy-password')
      await this.adapters.hasher.verify(password, await this.dummyHash)
      return false
    }
    return this.adapters.hasher.verify(password, stored)
  }

  private async requireUnderLimit(email: Email): Promise<void> {
    const wait = await this.adapters.limiter.retryAfter(passwordKey(email), PASSWORD_ATTEMPTS)
    if (wait > 0) {
      throw new TooManyAttemptsError(wait)
    }
  }
}
