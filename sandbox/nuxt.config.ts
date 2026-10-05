import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '')

// Local development: the app at the root, plus the sandbox's dev data,
// sign-in stand-in and dev tools. `pnpm dev` runs this. Never built for
// production.
export default defineNuxtConfig({
  extends: ['..', '@kmjbyrne/sandbox'],

  runtimeConfig: {
    // json for the sandbox's dev data, or mysql for NUXT_DATABASE_URL.
    dataStore: 'json',
    // sandbox for the dev sign-in, or provider for the real one. Empty picks
    // sandbox unless an OIDC client id is set.
    signIn: ''
  },

  // Lets a second dev server, such as an agent's or a test's, run beside
  // yours. Two servers writing one build dir break each other's files.
  buildDir: process.env.NUXT_BUILD_DIR || undefined,

  // Nuxt resolves these against the app being run, so the root app's own
  // imports would point into the sandbox without them.
  alias: {
    '~': `${root}/app`,
    '@': `${root}/app`,
    '~~': root,
    '@@': root
  }
})
