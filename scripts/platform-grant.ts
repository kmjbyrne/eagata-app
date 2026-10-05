// Makes an existing user a platform admin, for a fresh install with none.
// Sign in to the app once first, then: pnpm platform:grant ada@example.com
import { parseEmail } from '@kmjbyrne/core'
import { createDatabase, MysqlRepositories } from '@kmjbyrne/nuxt-shell/mysql'

const [input] = process.argv.slice(2)
const url = process.env.NUXT_DATABASE_URL
if (!input || !url) {
  console.error('Usage: pnpm platform:grant <email>, with NUXT_DATABASE_URL set')
  process.exit(1)
}

const db = createDatabase(url)
try {
  const repositories = new MysqlRepositories(db)
  const user = await repositories.users.findByEmail(parseEmail(input))
  if (!user) {
    console.error(`No user has the email ${input}. Sign in to the app once, then run this again.`)
    process.exitCode = 1
  } else if (user.isPlatformAdmin) {
    console.log(`${user.email} is already a platform admin.`)
  } else {
    await repositories.users.update({ ...user, isPlatformAdmin: true })
    console.log(`${user.email} is now a platform admin.`)
  }
} finally {
  await db.$client.end()
}
