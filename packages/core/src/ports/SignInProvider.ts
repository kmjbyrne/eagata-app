import type { ProviderIdentity } from '../entities/User'

/** The secrets one sign-in round trip must carry from start to callback. */
export interface AuthorizationRequest {
  url: string
  state: string
  nonce: string
  codeVerifier: string
  /** The token exchange must name the same redirect URI. */
  redirectUri: string
}

export interface AuthorizationOptions {
  /** The account to preselect, usually an email. */
  loginHint?: string
  /** Where the provider sends the person back. Defaults to the provider's configured one. */
  redirectUri?: string
}

export interface SignInProvider {
  authorizationRequest(options?: AuthorizationOptions): Promise<AuthorizationRequest>
  complete(code: string, request: Pick<AuthorizationRequest, 'nonce' | 'codeVerifier' | 'redirectUri'>): Promise<ProviderIdentity>
}
