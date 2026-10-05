import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { OidcClient, OidcError } from './OidcClient'

const ISSUER = 'https://accounts.example.com'
const CONFIG = {
  issuer: ISSUER,
  issuerAliases: ['accounts.example.com'],
  clientId: 'client-1',
  clientSecret: 'shh',
  redirectUri: 'https://app.example.ie/api/auth/callback'
}

function jwt(claims: Record<string, unknown>): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'RS256' })}.${encode(claims)}.signature`
}

function validClaims(overrides: Record<string, unknown> = {}) {
  return {
    iss: ISSUER,
    aud: 'client-1',
    exp: Math.floor(Date.now() / 1000) + 300,
    nonce: 'n-1',
    sub: 'g-123',
    email: 'Keith@Example.ie',
    email_verified: true,
    ...overrides
  }
}

function fakeFetch(tokenResponse: { status?: number, body: unknown }, discoveryIssuer = ISSUER) {
  const calls: { url: string, body?: URLSearchParams }[] = []
  const fetchFn = (async (input: string, init?: RequestInit) => {
    calls.push({ url: input, body: init?.body as URLSearchParams | undefined })
    if (input.endsWith('/.well-known/openid-configuration')) {
      return Response.json({
        issuer: discoveryIssuer,
        authorization_endpoint: `${ISSUER}/authorize`,
        token_endpoint: `${ISSUER}/token`
      })
    }
    return Response.json(tokenResponse.body, { status: tokenResponse.status ?? 200 })
  }) as typeof fetch
  return { fetchFn, calls }
}

/** A fetch that never answers, until its signal aborts. */
const hangingFetch = ((_: string, init?: RequestInit) => new Promise<Response>((_, reject) => {
  init?.signal?.addEventListener('abort', () => reject(init.signal!.reason))
})) as typeof fetch

describe('OidcClient', () => {
  describe('authorizationRequest', () => {
    it('builds a code flow URL with state, nonce and an S256 PKCE challenge', async () => {
      const { fetchFn } = fakeFetch({ body: {} })
      const request = await new OidcClient(CONFIG, fetchFn).authorizationRequest()
      const url = new URL(request.url)

      expect(url.origin + url.pathname).toBe(`${ISSUER}/authorize`)
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        response_type: 'code',
        client_id: 'client-1',
        redirect_uri: CONFIG.redirectUri,
        scope: 'openid email profile',
        state: request.state,
        nonce: request.nonce,
        code_challenge: createHash('sha256').update(request.codeVerifier).digest('base64url'),
        code_challenge_method: 'S256'
      })
    })

    it('sends a login hint only when given one', async () => {
      const { fetchFn } = fakeFetch({ body: {} })
      const client = new OidcClient(CONFIG, fetchFn)
      const hinted = new URL((await client.authorizationRequest({ loginHint: 'ada@example.com' })).url)
      const plain = new URL((await client.authorizationRequest()).url)

      expect(hinted.searchParams.get('login_hint')).toBe('ada@example.com')
      expect(plain.searchParams.has('login_hint')).toBe(false)
    })

    it('makes fresh secrets for every request and discovers once', async () => {
      const { fetchFn, calls } = fakeFetch({ body: {} })
      const client = new OidcClient(CONFIG, fetchFn)
      const first = await client.authorizationRequest()
      const second = await client.authorizationRequest()

      expect(second.state).not.toBe(first.state)
      expect(second.nonce).not.toBe(first.nonce)
      expect(second.codeVerifier).not.toBe(first.codeVerifier)
      expect(calls).toHaveLength(1)
    })

    it('rejects a discovery document for another issuer', async () => {
      const { fetchFn } = fakeFetch({ body: {} }, 'https://evil.example.com')

      await expect(new OidcClient(CONFIG, fetchFn).authorizationRequest()).rejects.toThrow(OidcError)
    })

    it('times out a discovery request that never answers', async () => {
      await expect(new OidcClient({ ...CONFIG, timeoutMs: 10 }, hangingFetch).authorizationRequest())
        .rejects.toThrow(/Discovery timed out/)
    })

    it('rejects a discovery document that names only an issuer alias', async () => {
      const { fetchFn } = fakeFetch({ body: {} }, 'accounts.example.com')

      await expect(new OidcClient(CONFIG, fetchFn).authorizationRequest()).rejects.toThrow(OidcError)
    })
  })

  describe('complete', () => {
    const request = { nonce: 'n-1', codeVerifier: 'v-1' }

    it('exchanges the code with the secret and verifier, and returns the identity', async () => {
      const { fetchFn, calls } = fakeFetch({ body: { id_token: jwt(validClaims()) } })

      expect(await new OidcClient(CONFIG, fetchFn).complete('code-1', request)).toEqual({
        issuer: ISSUER,
        subject: 'g-123',
        email: 'Keith@Example.ie',
        emailVerified: true,
        picture: null
      })
      expect(Object.fromEntries(calls[1]!.body!)).toEqual({
        grant_type: 'authorization_code',
        code: 'code-1',
        redirect_uri: CONFIG.redirectUri,
        client_id: 'client-1',
        client_secret: 'shh',
        code_verifier: 'v-1'
      })
    })

    it('accepts an issuer alias, an audience list with our azp and a string email_verified', async () => {
      const claims = validClaims({ iss: 'accounts.example.com', aud: ['other', 'client-1'], azp: 'client-1', email_verified: 'true' })
      const { fetchFn } = fakeFetch({ body: { id_token: jwt(claims) } })

      await expect(new OidcClient(CONFIG, fetchFn).complete('code-1', request))
        .resolves.toMatchObject({ subject: 'g-123', emailVerified: true })
    })

    it('reports an unverified email as unverified', async () => {
      const { fetchFn } = fakeFetch({ body: { id_token: jwt(validClaims({ email_verified: false })) } })

      await expect(new OidcClient(CONFIG, fetchFn).complete('code-1', request))
        .resolves.toMatchObject({ emailVerified: false })
    })

    it('returns the picture claim when the profile has one', async () => {
      const picture = 'https://images.example.com/a/photo.png'
      const { fetchFn } = fakeFetch({ body: { id_token: jwt(validClaims({ picture })) } })

      await expect(new OidcClient(CONFIG, fetchFn).complete('code-1', request))
        .resolves.toMatchObject({ picture })
    })

    it.each([
      ['another issuer', { iss: 'https://evil.example.com' }],
      ['another audience', { aud: 'someone-else' }],
      ['several audiences without azp', { aud: ['other', 'client-1'] }],
      ['several audiences with another azp', { aud: ['other', 'client-1'], azp: 'other' }],
      ['another azp', { azp: 'other' }],
      ['an expired token', { exp: Math.floor(Date.now() / 1000) - 3600 }],
      ['a different nonce', { nonce: 'replayed' }],
      ['no subject', { sub: undefined }],
      ['no email', { email: undefined }]
    ])('rejects %s', async (_, overrides) => {
      const { fetchFn } = fakeFetch({ body: { id_token: jwt(validClaims(overrides)) } })

      await expect(new OidcClient(CONFIG, fetchFn).complete('code-1', request)).rejects.toThrow(OidcError)
    })

    it('times out a token request that never answers', async () => {
      const { fetchFn } = fakeFetch({ body: {} })
      const client = new OidcClient({ ...CONFIG, timeoutMs: 10 }, ((url: string, init?: RequestInit) =>
        url.endsWith('/token') ? hangingFetch(url, init) : fetchFn(url, init)) as typeof fetch)

      await expect(client.complete('code-1', request)).rejects.toThrow(/Token exchange timed out/)
    })

    it('rejects a failed exchange and a response without an ID token', async () => {
      const failed = fakeFetch({ status: 400, body: { error: 'invalid_grant' } })
      const empty = fakeFetch({ body: { access_token: 'a' } })

      await expect(new OidcClient(CONFIG, failed.fetchFn).complete('code-1', request)).rejects.toThrow(OidcError)
      await expect(new OidcClient(CONFIG, empty.fetchFn).complete('code-1', request)).rejects.toThrow(OidcError)
    })
  })
})
