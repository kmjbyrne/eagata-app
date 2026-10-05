// Fills the shell's and the platform's extension points, so neither imports
// this layer. The platform's is unused when the platform isn't built in.
export default defineAppConfig({
  shell: {
    publicPaths: ['/link-account', '/forgot-password', '/reset-password'],
    loginExtras: ['PasswordSignIn'],
    securityExtras: ['PasswordSettings']
  },
  platform: {
    userExtras: ['PasswordInvite']
  }
})
