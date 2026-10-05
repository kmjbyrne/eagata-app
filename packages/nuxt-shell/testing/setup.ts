import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils/e2e'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

/**
 * Builds and boots an app or layer for route tests, with in-memory
 * repositories, a fake sign-in provider, and test-only endpoints that set up
 * data as a platform admin would:
 *
 * - `POST /__test/user` `{ email, name? }`: registration is closed, so sign-in needs one
 * - `POST /__test/company-org` `{ name, slug, previousSlugs?, members?: [email, role][], workspaces? }`
 * - `POST /__test/deactivate` `{ email }`
 * - `POST /__test/platform-admin` `{ email }`
 *
 * Boot a layer by its own folder: a test app inside the folder can't extend
 * it, because Nuxt skips a layer that contains the app.
 */
export interface TestHandler {
  route: string
  method: 'get' | 'post'
  handler: string
}

/** A layer's own test adapters and endpoints, added after the shell's. */
export interface TestExtras {
  plugins?: string[]
  handlers?: TestHandler[]
}

export function setupApp(rootDir: string, nuxtConfig: Record<string, unknown> = {}, extras: TestExtras = {}) {
  return setup({
    rootDir,
    nuxtConfig: {
      ...nuxtConfig,
      runtimeConfig: { ...nuxtConfig.runtimeConfig as Record<string, unknown>, sessionSecret: 'route-tests-only-session-secret-0123456789' },
      nitro: {
        plugins: [here('./server/testAdapters.ts'), ...(extras.plugins ?? [])],
        handlers: [
          { route: '/__test/user', method: 'post', handler: here('./server/user.post.ts') },
          { route: '/__test/company-org', method: 'post', handler: here('./server/companyOrg.post.ts') },
          { route: '/__test/deactivate', method: 'post', handler: here('./server/deactivate.post.ts') },
          { route: '/__test/platform-admin', method: 'post', handler: here('./server/platformAdmin.post.ts') },
          ...(extras.handlers ?? [])
        ]
      }
    }
  })
}
