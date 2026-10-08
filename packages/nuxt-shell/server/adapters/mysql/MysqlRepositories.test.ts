import { fileURLToPath } from 'node:url'
import type { Email } from '@kmjbyrne/core'
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
    for (const table of ['workspace_invitations', 'workspace_memberships', 'org_memberships', 'workspaces', 'org_slugs', 'orgs', 'user_identities', 'users']) {
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

  // Written around core, which would refuse the accented emails before they got here.
  it('matches emails and identities exactly, never by accent or case', async () => {
    const repositories = new MysqlRepositories(db)
    await db.execute(sql`INSERT INTO users (id, display_name, email) VALUES ('exact-user', 'John', 'john@corp.com')`)
    await db.execute(sql`INSERT INTO user_identities (provider, subject, user_id) VALUES ('oidc', 'AbC', 'exact-user')`)
    await db.execute(sql`INSERT INTO orgs (id, name) VALUES ('exact-org', 'Exact')`)
    await db.execute(sql`INSERT INTO workspaces (id, org_id, name, slug) VALUES ('exact-ws', 'exact-org', 'Exact', 'exact')`)
    await db.execute(sql`INSERT INTO workspace_invitations (workspace_id, email, role, invited_by, created_at) VALUES ('exact-ws', 'john@corp.com', 'viewer', 'exact-user', NOW())`)

    expect(await repositories.users.findByEmail('jöhn@corp.com' as Email)).toBeNull()
    expect(await repositories.users.findByEmail('john@cörp.com' as Email)).toBeNull()
    expect(await repositories.users.findByIdentity({ provider: 'oidc', subject: 'abc' })).toBeNull()
    expect(await repositories.users.findByIdentity({ provider: 'OIDC', subject: 'AbC' })).toBeNull()
    expect(await repositories.invitations.listByEmail('jöhn@corp.com' as Email)).toEqual([])
    expect(await failure(db.execute(sql`INSERT INTO users (id, display_name, email) VALUES ('accented-user', 'Jöhn', 'jöhn@corp.com')`))).toBe('accepted')

    expect((await repositories.users.findByEmail('john@corp.com' as Email))?.id).toBe('exact-user')
    expect((await repositories.users.findByIdentity({ provider: 'oidc', subject: 'AbC' }))?.id).toBe('exact-user')
  })
})
