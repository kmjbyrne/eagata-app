import { existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

// DOTENV=.env.production pnpm db:migrate. drizzle-kit rejects flags it
// doesn't know, so the file comes in through a variable.
const envFile = process.env.DOTENV || '.env'
if (existsSync(envFile)) {
  process.loadEnvFile(envFile)
}

// The shell's tables and, as the app grows, its own. One migration history
// for both: after upgrading @kmjbyrne/nuxt-shell, run `pnpm db:generate`.
export default defineConfig({
  dialect: 'mysql',
  schema: [
    './node_modules/@kmjbyrne/nuxt-shell/server/adapters/mysql/schema.ts',
    './node_modules/@kmjbyrne/nuxt-passwords/server/adapters/mysql/schema.ts',
    './node_modules/@kmjbyrne/nuxt-feedback/server/adapters/mysql/schema.ts'
  ],
  out: './server/migrations',
  dbCredentials: {
    // The migrator may change the schema, as in compose's tools service.
    url: process.env.MIGRATION_DATABASE_URL || process.env.NUXT_DATABASE_URL || ''
  }
})
