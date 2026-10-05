import { parseEmail, type AuthorizationOptions, type AuthorizationRequest, type ProviderIdentity, type SignInProvider } from '@kmjbyrne/core'

export interface FakeCode {
  nonce: string
  subject: string
  email: string
  emailVerified: boolean
  name: string | null
}

/**
 * Plays the provider in route tests. Its authorize URL carries the nonce, so
 * a test can make the code the provider would send back.
 */
export class FakeSignInProvider implements SignInProvider {
  private count = 0

  async authorizationRequest(options?: AuthorizationOptions): Promise<AuthorizationRequest> {
    const n = ++this.count
    const request = { state: `state-${n}`, nonce: `nonce-${n}`, codeVerifier: `verifier-${n}` }
    const params = new URLSearchParams({ state: request.state, nonce: request.nonce, ...(options?.loginHint ? { login_hint: options.loginHint } : {}) })
    return { url: `https://idp.test/authorize?${params}`, ...request }
  }

  async complete(code: string, request: Pick<AuthorizationRequest, 'nonce'>): Promise<ProviderIdentity> {
    const claims = JSON.parse(Buffer.from(code, 'base64url').toString('utf8')) as FakeCode
    if (claims.nonce !== request.nonce) {
      throw new Error('Nonce does not match')
    }
    return {
      provider: 'test',
      subject: claims.subject,
      email: parseEmail(claims.email),
      emailVerified: claims.emailVerified,
      name: claims.name,
      picture: null
    }
  }
}
