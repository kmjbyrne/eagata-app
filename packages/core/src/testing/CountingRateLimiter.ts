import type { RateLimiter, RateRule } from '../ports/RateLimiter'

/** Counts events per key with no time window: a key over its limit stays over until reset. */
export class CountingRateLimiter implements RateLimiter {
  private readonly counts = new Map<string, number>()

  async retryAfter(key: string, rule: RateRule): Promise<number> {
    return (this.counts.get(key) ?? 0) >= rule.limit ? rule.windowMs : 0
  }

  async hit(key: string): Promise<void> {
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1)
  }

  async reset(key: string): Promise<void> {
    this.counts.delete(key)
  }
}
