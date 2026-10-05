// Makes someone a platform admin, creating them if they don't exist. For the
// first platform admin of a fresh install, where registration is closed:
//   pnpm platform:grant you@example.com "Your Name"
// Then sign in with that email.
import { bootstrapPlatformAdmin } from '@kmjbyrne/core'
import { UuidIdGenerator } from '@kmjbyrne/nuxt-shell/adapters'
import { createDatabase, MysqlRepositories } from '@kmjbyrne/nuxt-shell/mysql'

const [email, displayName] = process.argv.slice(2)
const url = process.env.NUXT_DATABASE_URL
if (!email || !url) {
  console.error('Usage: pnpm platform:grant <email> [name], with NUXT_DATABASE_URL set')
  process.exit(1)
}

const db = createDatabase(url)
try {
  const { user, created } = await bootstrapPlatformAdmin(new MysqlRepositories(db), new UuidIdGenerator(), { email, displayName })
  console.log(created
    ? `Created ${user.email} as a platform admin, with a personal org. Sign in with that email.`
    : `${user.email} is a platform admin.`)
} finally {
  await db.$client.end()
}
