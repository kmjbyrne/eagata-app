// Everything every app needs on the Nuxt side. Settings come from env vars
// through runtimeConfig, e.g. NUXT_OIDC_ISSUER or NUXT_SESSION_SECRET.
export default defineNuxtConfig({
  // Its pages and components are Nuxt UI.
  modules: ['@nuxt/ui'],

  runtimeConfig: {
    // mysql://user:password@host:3306/database. Empty means no default store.
    databaseUrl: '',
    // At least 32 characters. Dev falls back to a fixed secret when empty.
    sessionSecret: '',
    oidc: {
      // Stored with each linked account. A provider with a preset in
      // @kmjbyrne/oidc, such as "google", needs no issuer settings.
      provider: 'google',
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
      // The sign-in button's label.
      signInLabel: 'Continue with Google'
    }
  }
})
