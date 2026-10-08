import { describe, expect, it } from 'vitest'
import { InMemoryRateLimiter } from './InMemoryRateLimiter'

const RULE = { limit: 3, windowMs: 60_000 }

describe('InMemoryRateLimiter', () => {
  function limiterAt(start: number) {
    const clock = { now: start }
    return { clock, limiter: new InMemoryRateLimiter(() => clock.now) }
  }

  it('counts attempts until the key reaches the limit, then refuses without counting', async () => {
    const { limiter } = limiterAt(0)
    expect(await limiter.consume('k', RULE)).toBe(0)
    expect(await limiter.consume('k', RULE)).toBe(0)
    expect(await limiter.consume('k', RULE)).toBe(0)

    expect(await limiter.consume('k', RULE)).toBe(60_000)
    expect(await limiter.consume('k', RULE)).toBe(60_000)
  })

  it('lets only the limit through when attempts arrive together', async () => {
    const { limiter } = limiterAt(0)
    const waits = await Promise.all(Array.from({ length: 10 }, () => limiter.consume('k', RULE)))

    expect(waits.filter(wait => wait === 0)).toHaveLength(3)
  })

  it('frees the key as the oldest attempt leaves the window', async () => {
    const { clock, limiter } = limiterAt(0)
    for (const at of [0, 10_000, 20_000]) {
      clock.now = at
      await limiter.consume('k', RULE)
    }

    clock.now = 59_000
    expect(await limiter.consume('k', RULE)).toBe(1_000)
    clock.now = 60_001
    expect(await limiter.consume('k', RULE)).toBe(0)
  })

  it('keeps keys apart and clears one on reset', async () => {
    const { limiter } = limiterAt(0)
    for (let i = 0; i < 3; i++) {
      await limiter.consume('a', RULE)
    }

    expect(await limiter.consume('b', RULE)).toBe(0)
    await limiter.reset('a')
    expect(await limiter.consume('a', RULE)).toBe(0)
  })
})
