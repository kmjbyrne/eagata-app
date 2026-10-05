// The platform admin area, for the app's operators. An app extends it only
// when NUXT_PLATFORM=true, so builds without it contain none of its code.
export default defineNuxtConfig({
  extends: ['@kmjbyrne/nuxt-shell'],

  routeRules: {
    '/platform/**': { ssr: false }
  }
})
