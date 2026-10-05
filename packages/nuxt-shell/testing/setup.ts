import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils/e2e'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

/**
 * Builds and boots an app or layer for route tests, with in-memory
 * repositories, a fake sign-in provider, and test-only endpoints that set up
 * data as a platform admin would:
 *
 * - `POST /__test/company-org` `{ name, slug, previousSlugs?, members?: [email, role][], workspaces? }`
 * - `POST /__test/deactivate` `{ email }`
 * - `POST /__test/platform-admin` `{ email }`
 *
 * Boot a layer by its own folder: a test app inside the folder can't extend
 * it, because Nuxt skips a layer that contains the app.
 */
export function setupApp(rootDir: string, nuxtConfig: Record<string, unknown> = {}) {
  return setup({
    rootDir,
    nuxtConfig: {
      ...nuxtConfig,
      runtimeConfig: { sessionSecret: 'route-tests-only-session-secret-0123456789' },
      nitro: {
        plugins: [here('./server/testAdapters.ts')],
        handlers: [
          { route: '/__test/company-org', method: 'post', handler: here('./server/companyOrg.post.ts') },
          { route: '/__test/deactivate', method: 'post', handler: here('./server/deactivate.post.ts') },
          { route: '/__test/platform-admin', method: 'post', handler: here('./server/platformAdmin.post.ts') }
        ]
      }
    }
  })
}
