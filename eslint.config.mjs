// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import { getDefaultAttributes } from 'eslint-plugin-better-tailwindcss/api/defaults'

// Dependencies point one way: core, oidc and json-store depend on nothing of
// ours; the shell on core and oidc; the platform and passwords on the shell; the sandbox on
// anything; the app never on the sandbox. Packages are used through their
// public entry points only, and frontend code imports contracts, never core
// or server code. ESLint replaces a rule for files that two blocks match, so
// each block below carries the whole list for its files.

/** Deep imports, except the published entry points. */
const deepImports = {
  group: [
    '@kmjbyrne/*/*',
    '!@kmjbyrne/core/testing',
    '!@kmjbyrne/core/contract',
    '!@kmjbyrne/core/media',
    '!@kmjbyrne/core/media/testing',
    '!@kmjbyrne/core/passwords',
    '!@kmjbyrne/core/passwords/testing',
    '!@kmjbyrne/core/passwords/contract',
    '!@kmjbyrne/nuxt-media/types',
    '!@kmjbyrne/nuxt-media/adapters',
    '!@kmjbyrne/nuxt-passwords/types',
    '!@kmjbyrne/nuxt-passwords/mysql',
    '!@kmjbyrne/nuxt-passwords/adapters',
    '!@kmjbyrne/json-store/contract',
    '!@kmjbyrne/nuxt-shell/types',
    '!@kmjbyrne/nuxt-shell/mysql',
    '!@kmjbyrne/nuxt-shell/adapters',
    '!@kmjbyrne/nuxt-shell/contracts',
    '!@kmjbyrne/nuxt-shell/testing',
    '!@kmjbyrne/sandbox/json-store',
    '!@kmjbyrne/sandbox/oidc'
  ],
  message: 'Use the package\'s public entry points.'
}

const ban = (packages, message) => ({ group: packages, message })

const noFramework = ban(['nuxt', 'nuxt/*', '#*', 'h3', 'vue', '@nuxt/*'], 'Plain TypeScript packages have no Nuxt dependency.')
const noStorage = ban(['drizzle-orm', 'drizzle-orm/*', 'mysql2', 'mysql2/*', 'lowdb', 'lowdb/*'], 'Storage belongs in adapters, not here.')
const noOurPackages = ban(['@kmjbyrne/*'], 'This package depends on none of ours.')
const noDevTools = ban(['@kmjbyrne/sandbox', '@kmjbyrne/sandbox/*', '@kmjbyrne/json-store', '@kmjbyrne/json-store/*'], 'Only the sandbox may use dev tools: production code never does.')
const noPlatform = ban(['@kmjbyrne/nuxt-platform', '@kmjbyrne/nuxt-platform/*'], 'Nothing depends on the platform layer.')
const frontend = [
  ban(['@kmjbyrne/core', '@kmjbyrne/core/*', '@kmjbyrne/nuxt-shell/mysql', '@kmjbyrne/nuxt-shell/adapters'], 'Frontend code imports contracts, not core or server code.'),
  { group: ['**/server/**'], message: 'Frontend code imports contracts, not server code.', allowTypeImports: true }
]

const restrict = (...patterns) => ({ 'no-restricted-imports': ['error', { patterns: [deepImports, ...patterns] }] })

const shell = [noDevTools, noPlatform]
const platform = [noDevTools, ban(['@kmjbyrne/oidc'], 'The platform layer uses the shell, not the OIDC client.')]
// Optional layers on the shell: passwords and media.
const passwords = [noDevTools, noPlatform, ban(['@kmjbyrne/oidc'], 'Optional layers use the shell, not the OIDC client.')]
const sandbox = [noPlatform]
const app = [noDevTools]

export default withNuxt(
  betterTailwindcss.configs['correctness-error'],
  {
    settings: {
      'better-tailwindcss': {
        entryPoint: 'app/assets/css/main.css',
        attributes: [
          ...getDefaultAttributes(),
          ['^v-bind:ui$', [{ match: 'objectValues' }]]
        ]
      }
    }
  },
  { name: 'dependencies/everywhere', rules: restrict() },
  {
    name: 'dependencies/core',
    files: ['packages/core/src/**'],
    ignores: ['packages/core/src/testing/**', 'packages/core/src/**/*.test.ts'],
    rules: restrict(noOurPackages, noFramework, noStorage, ban(['zod', 'vitest'], 'Core\'s main entry has no Zod and no test code.'))
  },
  {
    name: 'dependencies/core-testing',
    files: ['packages/core/src/testing/**', 'packages/core/src/**/*.test.ts'],
    rules: restrict(noOurPackages, noFramework, noStorage)
  },
  { name: 'dependencies/oidc', files: ['packages/oidc/**'], rules: restrict(noOurPackages, noFramework, noStorage) },
  { name: 'dependencies/json-store', files: ['packages/json-store/**'], rules: restrict(noOurPackages, noFramework) },
  { name: 'dependencies/nuxt-shell', files: ['packages/nuxt-shell/**'], rules: restrict(...shell) },
  { name: 'dependencies/nuxt-platform', files: ['packages/nuxt-platform/**'], rules: restrict(...platform) },
  { name: 'dependencies/nuxt-passwords', files: ['packages/nuxt-passwords/**'], rules: restrict(...passwords) },
  { name: 'dependencies/nuxt-media', files: ['packages/nuxt-media/**'], rules: restrict(...passwords) },
  { name: 'dependencies/sandbox', files: ['packages/sandbox/**', 'sandbox/**'], rules: restrict(...sandbox) },
  { name: 'dependencies/app', files: ['app/**', 'server/**', 'shared/**', 'core/**', 'scripts/**'], rules: restrict(...app) },
  { name: 'dependencies/nuxt-shell-frontend', files: ['packages/nuxt-shell/app/**'], rules: restrict(...shell, ...frontend) },
  { name: 'dependencies/nuxt-platform-frontend', files: ['packages/nuxt-platform/app/**'], rules: restrict(...platform, ...frontend) },
  { name: 'dependencies/nuxt-passwords-frontend', files: ['packages/nuxt-passwords/app/**'], rules: restrict(...passwords, ...frontend) },
  { name: 'dependencies/sandbox-frontend', files: ['packages/sandbox/app/**', 'sandbox/app/**'], rules: restrict(...sandbox, ...frontend) },
  { name: 'dependencies/app-frontend', files: ['app/**'], rules: restrict(...app, ...frontend) }
)
