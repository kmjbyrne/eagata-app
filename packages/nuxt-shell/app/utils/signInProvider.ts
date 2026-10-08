/** Display names of providers the shell knows. Each also has its own logo in `ProviderLogo`. */
const PROVIDER_NAMES: Readonly<Record<string, string>> = {
  google: 'Google',
  janus: 'Janus'
}

export interface SignInProviderDisplay {
  /** The provider's name, as buttons and settings show it. */
  name: string
  /** The sign-in button's label. */
  label: string
}

/**
 * How the sign-in provider appears. A known provider has its own name, and
 * any other is named after its key. A configured label wins over the
 * derived one.
 */
export function signInProviderDisplay(provider: string, label = ''): SignInProviderDisplay {
  const name = PROVIDER_NAMES[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1)
  return { name, label: label || `Continue with ${name}` }
}
