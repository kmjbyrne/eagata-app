import { fileURLToPath } from 'node:url'

// Everything every app needs on the Nuxt side. Settings come from env vars
// through runtimeConfig, e.g. NUXT_OIDC_ISSUER or NUXT_SESSION_SECRET.
export default defineNuxtConfig({
  // Its pages and components are Nuxt UI.
  modules: ['@nuxt/ui', 'evlog/nuxt'],

  css: [fileURLToPath(new URL('./app/assets/css/autofill.css', import.meta.url))],

  runtimeConfig: {
    // mysql://user:password@host:3306/database. Empty means no default store.
    databaseUrl: '',
    // At least 32 characters. Dev falls back to a fixed secret when empty.
    sessionSecret: '',
    // Required outside dev. In dev, with no SES sender, mail is logged instead
    // of sent. Blank keys use the AWS default credential chain: environment,
    // ~/.aws, or an instance role.
    email: {
      sesSender: '',
      sesRegion: 'eu-west-1',
      accessKeyId: '',
      secretAccessKey: ''
    },
    oidc: {
      // For a provider without a preset. Overrides the preset's.
      issuer: '',
      // Comma-separated other spellings of the issuer in ID tokens.
      issuerAliases: '',
      clientId: '',
      clientSecret: '',
      // Defaults to /api/auth/callback on the request's own origin.
      redirectUri: ''
    },
    public: {
      // Stored with each linked account, and picks the button's logo. A
      // provider with a preset in @kmjbyrne/oidc, such as "google", needs no
      // issuer settings.
      signInProvider: 'google',
      // The sign-in button's label.
      signInLabel: 'Continue with Google'
    }
  },
  routeRules: {
    // The profile moved into settings.
    '/profile': { redirect: '/settings' }
  },

  // One wide event per API request: method, path, status, duration, the
  // signed-in user's id, and any error. Pretty in dev, JSON in production.
  evlog: {
    env: { service: 'app' },
    include: ['/api/**'],
    exclude: ['/api/_nuxt_icon/**'],
    redact: {
      paths: ['**.password', '**.currentPassword', '**.newPassword', '**.token', '**.code', '**.state', '**.secret']
    }
  }
})
