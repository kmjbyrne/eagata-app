// Makes someone a platform admin, creating them if they don't exist. For the
// first platform admin of a fresh install, where registration is closed:
//
//   make admin ENV=production EMAIL=you@example.com
//   make admin-password ENV=production EMAIL=you@example.com
//
// With ADMIN_PASSWORD set, which `make admin-password` prompts for, that's
// their password. Otherwise someone without a password gets a link, printed
// below, to choose their own, valid for 72 hours. Or they sign in with Google
// using the same email.
import { randomBytes } from 'node:crypto'
import { bootstrapPlatformAdmin } from '@kmjbyrne/core'
import { hashResetToken, INVITE_TOKEN_TTL_MS, parsePassword } from '@kmjbyrne/core/passwords'
import { WerkzeugPasswordHasher } from '@kmjbyrne/nuxt-passwords/adapters'
import { UuidIdGenerator } from '@kmjbyrne/nuxt-shell/adapters'
import { createDatabase, MysqlRepositories } from '@kmjbyrne/nuxt-shell/mysql'
import { MysqlPasswordRepository } from '@kmjbyrne/nuxt-passwords/mysql'

const email = process.argv[2]
const displayName = process.argv[3]
const password = process.env.ADMIN_PASSWORD
const url = process.env.NUXT_DATABASE_URL
if (!email || !url) {
  console.error('Usage: platform-grant <email> [name], with NUXT_DATABASE_URL set')
  process.exit(1)
}

const db = createDatabase(url)
try {
  const { user, created } = await bootstrapPlatformAdmin(new MysqlRepositories(db), new UuidIdGenerator(), { email, displayName })
  console.log(created ? `Created ${user.email} as a platform admin, with a personal org.` : `${user.email} is a platform admin.`)

  const passwords = new MysqlPasswordRepository(db)
  if (password) {
    const now = new Date()
    await passwords.setHash(user.id, await new WerkzeugPasswordHasher().hash(parsePassword(password)), now)
    await passwords.revokeResets(user.id, now)
    console.log('Password set. Sign in with that email and password.')
  } else if (await passwords.findHash(user.id)) {
    console.log('They already have a password.')
  } else {
    const token = randomBytes(32).toString('base64url')
    const now = new Date()
    await passwords.revokeResets(user.id, now)
    await passwords.createReset({ userId: user.id, tokenHash: hashResetToken(token), expiresAt: new Date(now.getTime() + INVITE_TOKEN_TTL_MS) })
    const origin = (process.env.NUXT_APP_URL || '').replace(/\/$/, '')
    console.log(`Choose a password within ${INVITE_TOKEN_TTL_MS / 3_600_000} hours: ${origin || '<NUXT_APP_URL>'}/reset-password?token=${token}`)
    console.log('Or sign in with Google using the same email.')
  }
} finally {
  await db.$client.end()
}
