// Images uploaded in a workspace, such as screenshots in feedback. Kept on
// local disk for now, behind the MediaStorage port, so S3 can replace it.
export default defineNuxtConfig({
  extends: ['@kmjbyrne/nuxt-shell'],

  runtimeConfig: {
    // Relative to where the server starts. In Docker, mount a volume here.
    mediaDir: './instance/media'
  }
})
