/** The configured sign-in provider's key, name and button label. */
export function useSignInProvider() {
  const { public: { signInProvider, signInLabel } } = useRuntimeConfig()
  return { provider: signInProvider, ...signInProviderDisplay(signInProvider, signInLabel) }
}
