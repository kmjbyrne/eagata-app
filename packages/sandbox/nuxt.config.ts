// Local development only: the app's data in a JSON file, a stand-in for the
// sign-in provider, and dev tools. Apps extend it from their sandbox/ wrapper,
// never from the app itself, so production builds never contain it.
export default defineNuxtConfig({
  // For the shell's session and adapters, as "Sign in as" uses.
  extends: ['@kmjbyrne/nuxt-shell'],
  // Its components are Nuxt UI components.
  modules: ['@nuxt/ui']
})
