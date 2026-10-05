import { describe, expect, it } from 'vitest'
import { InMemoryRateLimiter } from './InMemoryRateLimiter'

const RULE = { limit: 3, windowMs: 60_000 }

describe('InMemoryRateLimiter', () => {
  function limiterAt(start: number) {
    const clock = { now: start }
    return { clock, limiter: new InMemoryRateLimiter(() => clock.now) }
  }

  it('allows a key until it reaches the limit', async () => {
    const { limiter } = limiterAt(0)
    await limiter.hit('k', RULE)
    await limiter.hit('k', RULE)
    expect(await limiter.retryAfter('k', RULE)).toBe(0)

    await limiter.hit('k', RULE)
    expect(await limiter.retryAfter('k', RULE)).toBe(60_000)
  })

  it('frees the key as the oldest hit leaves the window', async () => {
    const { clock, limiter } = limiterAt(0)
    for (const at of [0, 10_000, 20_000]) {
      clock.now = at
      await limiter.hit('k', RULE)
    }

    clock.now = 59_000
    expect(await limiter.retryAfter('k', RULE)).toBe(1_000)
    clock.now = 60_001
    expect(await limiter.retryAfter('k', RULE)).toBe(0)
  })

  it('keeps keys apart and clears one on reset', async () => {
    const { limiter } = limiterAt(0)
    for (let i = 0; i < 3; i++) {
      await limiter.hit('a', RULE)
    }

    expect(await limiter.retryAfter('b', RULE)).toBe(0)
    await limiter.reset('a')
    expect(await limiter.retryAfter('a', RULE)).toBe(0)
  })
})
