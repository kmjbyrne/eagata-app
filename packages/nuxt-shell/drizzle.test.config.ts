import { defineConfig } from 'drizzle-kit'

// Migrations for this package's own tests only. Apps generate their own from
// the same schema, next to their tables, and those are what production runs.
export default defineConfig({
  dialect: 'mysql',
  schema: './server/adapters/mysql/schema.ts',
  out: './test/mysql-migrations'
})
