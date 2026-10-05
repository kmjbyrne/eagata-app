import { fileURLToPath } from 'node:url'
import { passwordRepositoryContract } from '@kmjbyrne/core/passwords/contract'
import { createDatabase } from '@kmjbyrne/nuxt-shell/mysql'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { afterAll, beforeAll, describe } from 'vitest'
import { MysqlPasswordRepository } from './MysqlPasswordRepository'

const folder = (path: string) => fileURLToPath(new URL(path, import.meta.url))

const url = process.env.NUXT_TEST_DATABASE_URL

// Needs a real database, so it runs only when NUXT_TEST_DATABASE_URL is set.
describe.skipIf(!url)('MysqlPasswordRepository', () => {
  const db = createDatabase(url!)

  beforeAll(async () => {
    // The shell's tables first, which these refer to, then this package's,
    // with their own journal so the two histories stay apart.
    await migrate(db, { migrationsFolder: folder('../../../../nuxt-shell/test/mysql-migrations') })
    await migrate(db, { migrationsFolder: folder('../../../test/mysql-migrations'), migrationsTable: '__drizzle_passwords_migrations' })
  })

  afterAll(() => db.$client.end())

  passwordRepositoryContract(
    () => new MysqlPasswordRepository(db),
    async (id) => {
      await db.execute(sql`INSERT INTO users (id, display_name, email) VALUES (${id}, 'Password Test', ${`${id}@example.com`})`)
    }
  )
})
