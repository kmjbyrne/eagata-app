import { existsSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

// Settings such as NUXT_TEST_DATABASE_URL. Tests that need them skip without.
if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

// Every MariaDB test shares the one test database, so those run one file at
// a time. Everything else runs in parallel.
const mariadb = ['packages/*/server/adapters/mysql/**/*.test.ts']

export default defineConfig({
  server: {
    allowedHosts: ['eagata.com']
  },
  test: {
    // Route tests build and boot a Nuxt server first.
    hookTimeout: 180_000,
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'main',
          include: ['packages/*/src/**/*.test.ts', 'packages/*/server/**/*.test.ts', 'packages/*/test/**/*.test.ts'],
          exclude: ['**/node_modules/**', ...mariadb]
        }
      },
      {
        extends: true,
        test: { name: 'mariadb', include: mariadb, fileParallelism: false }
      }
    ]
  }
})
