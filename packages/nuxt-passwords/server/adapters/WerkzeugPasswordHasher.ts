import { pbkdf2, randomInt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { PasswordHasher } from '@kmjbyrne/core/passwords'

const derive = promisify(pbkdf2)

const SALT_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const STORED = /^pbkdf2:(sha256|sha512):(\d+)\$([^$]+)\$([0-9a-f]+)$/
const DIGEST_BYTES = { sha256: 32, sha512: 64 } as const

/**
 * Werkzeug's `generate_password_hash` pbkdf2 format,
 * `pbkdf2:sha256:<iterations>$<salt>$<hex>`, so passwords hashed by a Python
 * app keep working. The salt is used as text, as Werkzeug does.
 */
export class WerkzeugPasswordHasher implements PasswordHasher {
  constructor(private readonly iterations = 600_000) {}

  async hash(password: string): Promise<string> {
    const salt = Array.from({ length: 16 }, () => SALT_CHARS[randomInt(SALT_CHARS.length)]).join('')
    const key = await derive(password, salt, this.iterations, DIGEST_BYTES.sha256, 'sha256')
    return `pbkdf2:sha256:${this.iterations}$${salt}$${key.toString('hex')}`
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const match = STORED.exec(stored)
    if (!match) {
      return false
    }
    const [, digest, iterations, salt, hex] = match as unknown as [string, 'sha256' | 'sha512', string, string, string]
    const expected = Buffer.from(hex, 'hex')
    if (expected.length !== DIGEST_BYTES[digest]) {
      return false
    }
    const actual = await derive(password, salt, Number(iterations), expected.length, digest)
    return timingSafeEqual(actual, expected)
  }
}
