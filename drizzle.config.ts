import { existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

// The shell's tables and, as the app grows, its own. One migration history
// for both: after upgrading @kmjbyrne/nuxt-shell, run `pnpm db:generate`.
export default defineConfig({
  dialect: 'mysql',
  schema: ['./node_modules/@kmjbyrne/nuxt-shell/server/adapters/mysql/schema.ts'],
  out: './server/migrations',
  dbCredentials: {
    url: process.env.NUXT_DATABASE_URL ?? ''
  }
})
