export interface OidcPreset {
  issuer: string
  /** Other spellings of the issuer the provider puts in `iss`. */
  issuerAliases: string[]
}

/** Known providers, so configuring one takes only a client id and secret. */
export const OIDC_PRESETS: Readonly<Record<string, OidcPreset>> = {
  // Google's ID tokens name the issuer with or without the scheme.
  google: { issuer: 'https://accounts.google.com', issuerAliases: ['accounts.google.com'] }
}
