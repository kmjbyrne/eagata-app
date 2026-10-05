import type { RateLimiter, RateRule } from '@kmjbyrne/core'

const SWEEP_EVERY = 1000

/**
 * Sliding-window counts held in process memory. Enough for one app instance;
 * counts reset on restart and are not shared between instances.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, { at: number[], windowMs: number }>()
  private sinceSweep = 0

  constructor(private readonly now: () => number = Date.now) {}

  async retryAfter(key: string, rule: RateRule): Promise<number> {
    const recent = this.recent(key, rule.windowMs)
    if (recent.length < rule.limit) {
      return 0
    }
    return recent[recent.length - rule.limit]! + rule.windowMs - this.now()
  }

  async hit(key: string, rule: RateRule): Promise<void> {
    const at = [...this.recent(key, rule.windowMs), this.now()]
    this.hits.set(key, { at, windowMs: rule.windowMs })
    if (++this.sinceSweep >= SWEEP_EVERY) {
      this.sweep()
    }
  }

  async reset(key: string): Promise<void> {
    this.hits.delete(key)
  }

  private recent(key: string, windowMs: number): number[] {
    const since = this.now() - windowMs
    return (this.hits.get(key)?.at ?? []).filter(at => at > since)
  }

  private sweep(): void {
    this.sinceSweep = 0
    for (const [key, entry] of this.hits) {
      if (!this.recent(key, entry.windowMs).length) {
        this.hits.delete(key)
      }
    }
  }
}
