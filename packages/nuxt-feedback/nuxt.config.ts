// Feedback from workspace members to the platform. The platform's inbox is a
// sub-layer, ./platform, which an app extends only with the platform area.
export default defineNuxtConfig({
  extends: ['@kmjbyrne/nuxt-shell', '@kmjbyrne/nuxt-media', '@varcharley/editor']
})
