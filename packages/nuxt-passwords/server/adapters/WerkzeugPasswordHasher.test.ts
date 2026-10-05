import { describe, expect, it } from 'vitest'
import { WerkzeugPasswordHasher } from './WerkzeugPasswordHasher'

// Made by werkzeug.security.generate_password_hash(method='pbkdf2:sha256:150000').
const LEGACY = 'pbkdf2:sha256:150000$YJO2FilV$d8864218799f6f30403e157c1a9acf6cd4d1e85c186562ba3c6533e88321dc11'
const LEGACY_UNICODE = 'pbkdf2:sha256:150000$kU7AU3SL$c1a5c820f617e4dd659d4ae6d7d37378e36631a5f48f733e0bde1aece95c02b9'

const hasher = new WerkzeugPasswordHasher(1_000)

describe('WerkzeugPasswordHasher', () => {
  it('verifies hashes Werkzeug made', async () => {
    expect(await hasher.verify('correct horse battery staple', LEGACY)).toBe(true)
    expect(await hasher.verify('Síle-2026!', LEGACY_UNICODE)).toBe(true)
  })

  it('rejects a wrong password', async () => {
    expect(await hasher.verify('correct horse battery stapler', LEGACY)).toBe(false)
  })

  it.each([
    ['scrypt', 'scrypt:32768:8:1$salt$abcd'],
    ['a truncated digest', 'pbkdf2:sha256:150000$YJO2FilV$d886'],
    ['an empty string', '']
  ])('treats %s as unverifiable', async (_, stored) => {
    expect(await hasher.verify('anything', stored)).toBe(false)
  })

  it('hashes in the same format and verifies its own output', async () => {
    const stored = await hasher.hash('new password')

    expect(stored).toMatch(/^pbkdf2:sha256:1000\$[A-Za-z0-9]{16}\$[0-9a-f]{64}$/)
    expect(await hasher.verify('new password', stored)).toBe(true)
    expect(await hasher.hash('new password')).not.toBe(stored)
  })
})
