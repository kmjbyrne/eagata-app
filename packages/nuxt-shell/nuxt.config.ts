// Everything every app needs on the Nuxt side. Settings come from env vars
// through runtimeConfig, e.g. NUXT_OIDC_ISSUER or NUXT_SESSION_SECRET.
export default defineNuxtConfig({
  runtimeConfig: {
    // At least 32 characters. Dev falls back to a fixed secret when empty.
    sessionSecret: '',
    oidc: {
      // The name stored with each linked account, such as "google".
      provider: 'google',
      issuer: 'https://accounts.google.com',
      // Comma-separated other spellings of the issuer in ID tokens.
      issuerAliases: 'accounts.google.com',
      clientId: '',
      clientSecret: '',
      redirectUri: ''
    }
  }
})
