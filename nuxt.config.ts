// https://nuxt.com/docs/api/configuration/nuxt-config

// The platform admin area is opt-in, so a build without it ships none of its pages or API.
const platform = process.env.NUXT_PLATFORM || 'false'
if (!['true', 'false'].includes(platform)) {
  throw new Error(`NUXT_PLATFORM must be true or false, got "${platform}"`)
}

export default defineNuxtConfig({
  extends: [
    '@kmjbyrne/nuxt-shell',
    '@kmjbyrne/nuxt-passwords',
    // Brings media, for images, and the editor.
    '@kmjbyrne/nuxt-feedback',
    ...(platform === 'true' ? ['@kmjbyrne/nuxt-platform', '@kmjbyrne/nuxt-feedback/platform'] : [])
  ],

  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  // Charcoal with mint. People can still choose light under Appearance.
  colorMode: {
    preference: 'dark'
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  // The shell logs every /api request. This names the app in each event.
  evlog: {
    env: { service: 'eagata' }
  }
})
