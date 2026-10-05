import { fileURLToPath } from 'node:url'
import { feedbackRepositoryContract } from '@kmjbyrne/core/feedback/contract'
import { createDatabase } from '@kmjbyrne/nuxt-shell/mysql'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { afterAll, beforeAll, describe } from 'vitest'
import { MysqlFeedbackRepository } from './MysqlFeedbackRepository'

const folder = (path: string) => fileURLToPath(new URL(path, import.meta.url))

const url = process.env.NUXT_TEST_DATABASE_URL

// Needs a real database, so it runs only when NUXT_TEST_DATABASE_URL is set.
describe.skipIf(!url)('MysqlFeedbackRepository', () => {
  const db = createDatabase(url!)

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: folder('../../../../nuxt-shell/test/mysql-migrations') })
    await migrate(db, { migrationsFolder: folder('../../../test/mysql-migrations'), migrationsTable: '__drizzle_feedback_migrations' })
  })

  afterAll(() => db.$client.end())

  feedbackRepositoryContract(
    () => new MysqlFeedbackRepository(db),
    async ({ workspaceId, userId }) => {
      await db.execute(sql`INSERT INTO users (id, display_name, email) VALUES (${userId}, 'Feedback Test', ${`${userId}@example.com`})`)
      await db.execute(sql`INSERT INTO orgs (id, name) VALUES (${`org-${workspaceId}`}, 'Feedback Test')`)
      await db.execute(sql`INSERT INTO workspaces (id, org_id, name, slug) VALUES (${workspaceId}, ${`org-${workspaceId}`}, 'Feedback', ${workspaceId.slice(-30)})`)
    }
  )
})
