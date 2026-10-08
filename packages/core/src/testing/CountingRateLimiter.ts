import type { RateLimiter, RateRule } from '../ports/RateLimiter'

/** Counts events per key with no time window: a key over its limit stays over until reset. */
export class CountingRateLimiter implements RateLimiter {
  private readonly counts = new Map<string, number>()

  async consume(key: string, rule: RateRule): Promise<number> {
    const count = this.counts.get(key) ?? 0
    if (count >= rule.limit) {
      return rule.windowMs
    }
    this.counts.set(key, count + 1)
    return 0
  }

  async reset(key: string): Promise<void> {
    this.counts.delete(key)
  }
}
