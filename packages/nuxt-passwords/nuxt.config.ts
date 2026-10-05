// Optional passwords, beside the sign-in provider. An app extends this layer
// to have them, and removes it to have none: nothing else changes.
export default defineNuxtConfig({
  extends: ['@kmjbyrne/nuxt-shell'],

  runtimeConfig: {
    // Where links in emails point, such as https://app.example.com. Required
    // in production, where the request's own Host can't be trusted.
    appUrl: '',
    // Behind a proxy, read the client's address from X-Forwarded-For, so
    // per-address limits don't put every client in one bucket.
    trustProxy: false
  }
})
