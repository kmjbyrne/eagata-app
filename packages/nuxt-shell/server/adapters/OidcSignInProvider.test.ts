import { describe, expect, it } from 'vitest'
import type { OidcClientLike } from '@kmjbyrne/oidc'
import { OidcSignInProvider } from './OidcSignInProvider'

const client: OidcClientLike = {
  authorizationRequest: async options => ({ url: `https://idp.example.com/?hint=${options?.loginHint ?? ''}`, state: 's', nonce: 'n', codeVerifier: 'v', redirectUri: 'https://app.example.com/api/auth/callback' }),
  complete: async () => ({ issuer: 'https://idp.example.com', subject: 'sub-1', email: ' Ada@Example.com ', emailVerified: true, name: 'Ada', picture: null })
}

describe('OidcSignInProvider', () => {
  it('passes the authorization request through, hint included', async () => {
    expect((await new OidcSignInProvider('google', client).authorizationRequest({ loginHint: 'ada' })).url).toContain('hint=ada')
  })

  it('names the provider and parses the email', async () => {
    expect(await new OidcSignInProvider('google', client).complete('code', { nonce: 'n', codeVerifier: 'v', redirectUri: 'https://app.example.com/api/auth/callback' })).toEqual({
      provider: 'google',
      subject: 'sub-1',
      email: 'ada@example.com',
      emailVerified: true,
      name: 'Ada',
      picture: null
    })
  })
})
