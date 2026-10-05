import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils/e2e'

/**
 * Builds and boots the layer itself as an app, with in-memory adapters. A
 * test app inside the layer's folder can't extend it: Nuxt skips a layer that
 * contains the app.
 */
export function setupLayer() {
  return setup({
    rootDir: fileURLToPath(new URL('..', import.meta.url)),
    nuxtConfig: {
      runtimeConfig: { sessionSecret: 'route-tests-only-session-secret-0123456789' },
      nitro: {
        plugins: [fileURLToPath(new URL('./server/testAdapters.ts', import.meta.url))],
        handlers: [
          { route: '/__test/company-org', method: 'post', handler: fileURLToPath(new URL('./server/companyOrg.post.ts', import.meta.url)) },
          { route: '/__test/deactivate', method: 'post', handler: fileURLToPath(new URL('./server/deactivate.post.ts', import.meta.url)) }
        ]
      }
    }
  })
}
