import { defineConfig } from 'drizzle-kit'

// Migrations for this package's own tests only, applied after the shell's
// test migrations, whose tables these refer to.
export default defineConfig({
  dialect: 'mysql',
  schema: './server/adapters/mysql/schema.ts',
  out: './test/mysql-migrations'
})
