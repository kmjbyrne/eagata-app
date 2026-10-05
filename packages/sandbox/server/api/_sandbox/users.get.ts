/** The people "Sign in as" offers. None while the real provider handles sign-in. */
export default defineSandboxHandler(async () => {
  const sandbox = useSandbox()
  return sandbox.signIn ? sandbox.devUsers() : []
})
