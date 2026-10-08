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
  /**
   * Counts one attempt against the key and returns 0, or, when the key is
   * already at the rule's limit, counts nothing and returns the milliseconds
   * until it is back under. Checking and counting must be one step, so
   * attempts made at the same moment can't all pass the check.
   */
  consume(key: string, rule: RateRule): Promise<number>
  reset(key: string): Promise<void>
}
