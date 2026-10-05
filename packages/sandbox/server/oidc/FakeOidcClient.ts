import { randomBytes } from 'node:crypto'
import { OidcError, type AuthorizationOptions, type AuthorizationRequest, type CompleteRequest, type OidcClientLike, type OidcIdentity } from '@kmjbyrne/oidc'

export const SANDBOX_AUTHORIZE_PATH = '/_sandbox/oidc/authorize'
export const SANDBOX_ISSUER = 'sandbox'

/** What the consent screen hands back in place of a provider's code. */
export interface SandboxCode {
  nonce: string
  email: string
  name: string | null
  emailVerified: boolean
}

const token = () => randomBytes(16).toString('base64url')

export function encodeSandboxCode(code: SandboxCode): string {
  return Buffer.from(JSON.stringify(code)).toString('base64url')
}

/**
 * Stands in for a real OIDC provider, with the same shape as `OidcClient`.
 * Its authorization URL is the sandbox's consent screen, which sends the
 * person back to the app's real callback, so dev sign-in runs the real flow.
 * The same email always gets the same subject, so later sign-ins match the
 * linked account.
 */
export class FakeOidcClient implements OidcClientLike {
  constructor(private readonly authorizePath = SANDBOX_AUTHORIZE_PATH) {}

  async authorizationRequest(options: AuthorizationOptions = {}): Promise<AuthorizationRequest> {
    const [state, nonce, codeVerifier] = [token(), token(), token()] as [string, string, string]
    const redirectUri = options.redirectUri ?? '/api/auth/callback'
    const params = new URLSearchParams({ state, nonce, redirect_uri: redirectUri, ...(options.loginHint ? { login_hint: options.loginHint } : {}) })
    return { url: `${this.authorizePath}?${params}`, state, nonce, codeVerifier, redirectUri }
  }

  async complete(code: string, request: CompleteRequest): Promise<OidcIdentity> {
    let claims: SandboxCode
    try {
      claims = JSON.parse(Buffer.from(code, 'base64url').toString('utf8'))
    } catch {
      throw new OidcError('Malformed sandbox code')
    }
    if (claims.nonce !== request.nonce) {
      throw new OidcError('Sandbox code nonce does not match')
    }
    return {
      issuer: SANDBOX_ISSUER,
      subject: `sandbox|${claims.email.trim().toLowerCase()}`,
      email: claims.email,
      emailVerified: claims.emailVerified,
      name: claims.name,
      picture: null
    }
  }
}
