import { parseEmail, type AuthorizationOptions, type AuthorizationRequest, type ProviderIdentity, type SignInProvider } from '@kmjbyrne/core'
import type { OidcClientLike } from '@kmjbyrne/oidc'

/**
 * Core's sign-in port on any OIDC client: the real one in production, a
 * stand-in in the sandbox. Adds the configured provider name, and parses the
 * email into core's `Email`.
 */
export class OidcSignInProvider implements SignInProvider {
  constructor(
    private readonly provider: string,
    private readonly client: OidcClientLike
  ) {}

  authorizationRequest(options?: AuthorizationOptions): Promise<AuthorizationRequest> {
    return this.client.authorizationRequest(options)
  }

  async complete(code: string, request: Pick<AuthorizationRequest, 'nonce' | 'codeVerifier'>): Promise<ProviderIdentity> {
    const identity = await this.client.complete(code, request)
    return {
      provider: this.provider,
      subject: identity.subject,
      email: parseEmail(identity.email),
      emailVerified: identity.emailVerified,
      name: identity.name,
      picture: identity.picture
    }
  }
}
