// The sign-in stand-in lets anyone in as anyone. It must never serve real users.
export default defineNitroPlugin(() => {
  if (!import.meta.dev) {
    throw new Error('The sandbox is for local development only. Build the app without it.')
  }
})
