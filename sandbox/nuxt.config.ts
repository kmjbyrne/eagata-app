import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '')

// Local development: the app at the root, plus the sandbox's dev data,
// sign-in stand-in and dev tools. `pnpm dev` runs this. Never built for
// production.
export default defineNuxtConfig({
  extends: ['..', '@kmjbyrne/sandbox'],

  runtimeConfig: {
    // json for the sandbox's dev data, or mysql for NUXT_DATABASE_URL.
    dataStore: 'json'
  },

  // Nuxt resolves these against the app being run, so the root app's own
  // imports would point into the sandbox without them.
  alias: {
    '~': `${root}/app`,
    '@': `${root}/app`,
    '~~': root,
    '@@': root
  }
})
