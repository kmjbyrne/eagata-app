import { DomainError } from '../errors'

export interface RateRule {
  limit: number
  windowMs: number
}

export class TooManyAttemptsError extends DomainError {
  constructor(readonly retryAfterMs: number) {
    super(`Too many attempts. Try again in ${Math.max(1, Math.ceil(retryAfterMs / 60_000))} minute(s).`)
  }
}

export interface RateLimiter {
  /** Milliseconds until the key is back under the rule's limit, or 0 when it already is. */
  retryAfter(key: string, rule: RateRule): Promise<number>
  /** Counts one event against the key. */
  hit(key: string, rule: RateRule): Promise<void>
  reset(key: string): Promise<void>
}
