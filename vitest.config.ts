import { existsSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

// Settings such as NUXT_TEST_DATABASE_URL. Tests that need them skip without.
if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'packages/*/server/**/*.test.ts'],
    passWithNoTests: true
  }
})
