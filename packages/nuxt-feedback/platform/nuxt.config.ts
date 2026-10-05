// The platform's feedback inbox. An app extends this only alongside the
// platform area, so a build without the platform carries none of it.
export default defineNuxtConfig({
  extends: ['..', '@kmjbyrne/nuxt-platform']
})
