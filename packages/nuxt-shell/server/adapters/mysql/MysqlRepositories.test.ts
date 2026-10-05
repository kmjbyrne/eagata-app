import { fileURLToPath } from 'node:url'
import { repositoryContract } from '@kmjbyrne/core/contract'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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

  // Drizzle wraps the driver's error, which names the constraint.
  const failure = (query: Promise<unknown>) => query.then(() => 'accepted', (error: Error) => String((error.cause as Error | undefined)?.message ?? error.message))

  it('refuses a role core doesn\'t know, even written around core', async () => {
    await db.execute(sql`INSERT INTO users (id, display_name, email) VALUES ('check-user', 'Check', 'check@example.com')`)
    await db.execute(sql`INSERT INTO orgs (id, name) VALUES ('check-org', 'Check')`)
    await db.execute(sql`INSERT INTO workspaces (id, org_id, name, slug) VALUES ('check-ws', 'check-org', 'Check', 'check')`)

    expect(await failure(db.execute(sql`INSERT INTO org_memberships (org_id, user_id, role) VALUES ('check-org', 'check-user', 'ownr')`))).toMatch(/org_memberships_role_check/)
    expect(await failure(db.execute(sql`INSERT INTO workspace_memberships (workspace_id, user_id, role) VALUES ('check-ws', 'check-user', 'admin')`))).toMatch(/workspace_memberships_role_check/)
    expect(await failure(db.execute(sql`INSERT INTO platform_roles (user_id, role, granted_at) VALUES ('check-user', 'owner', NOW())`))).toMatch(/platform_roles_role_check/)
    await db.execute(sql`INSERT INTO org_memberships (org_id, user_id, role) VALUES ('check-org', 'check-user', 'owner')`)
  })
})
