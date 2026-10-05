import type { ProviderIdentity } from '../entities/User'

/** The secrets one sign-in round trip must carry from start to callback. */
export interface AuthorizationRequest {
  url: string
  state: string
  nonce: string
  codeVerifier: string
}

export interface AuthorizationOptions {
  /** The account to preselect, usually an email. */
  loginHint?: string
}

export interface SignInProvider {
  authorizationRequest(options?: AuthorizationOptions): Promise<AuthorizationRequest>
  complete(code: string, request: Pick<AuthorizationRequest, 'nonce' | 'codeVerifier'>): Promise<ProviderIdentity>
}
