// https://nuxt.com/docs/api/configuration/nuxt-config

// The platform admin area is opt-in, so a build without it ships none of its pages or API.
const platform = process.env.NUXT_PLATFORM || 'false'
if (!['true', 'false'].includes(platform)) {
  throw new Error(`NUXT_PLATFORM must be true or false, got "${platform}"`)
}

export default defineNuxtConfig({
  extends: ['@kmjbyrne/nuxt-shell', ...(platform === 'true' ? ['@kmjbyrne/nuxt-platform'] : [])],

  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
