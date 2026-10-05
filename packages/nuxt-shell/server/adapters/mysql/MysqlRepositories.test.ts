import { fileURLToPath } from 'node:url'
import { repositoryContract } from '@kmjbyrne/core/testing'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { afterAll, beforeAll, describe } from 'vitest'
import { createDatabase, MysqlRepositories } from './MysqlRepositories'

// Generated from schema.ts by `pnpm db:test-generate`, for these tests only.
const migrationsFolder = fileURLToPath(new URL('../../../test/mysql-migrations', import.meta.url))

const url = process.env.NUXT_TEST_DATABASE_URL

// Needs a real database, so it runs only when NUXT_TEST_DATABASE_URL is set.
describe.skipIf(!url)('MysqlRepositories', () => {
  const db = createDatabase(url!)

  beforeAll(async () => {
    await migrate(db, { migrationsFolder })
    for (const table of ['workspace_memberships', 'org_memberships', 'workspaces', 'org_slugs', 'orgs', 'user_identities', 'users']) {
      await db.execute(sql.raw(`DELETE FROM ${table}`))
    }
  })

  afterAll(() => db.$client.end())

  repositoryContract(() => new MysqlRepositories(db))
})
