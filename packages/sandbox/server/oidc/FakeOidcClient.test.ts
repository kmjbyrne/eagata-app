import { OidcError } from '@kmjbyrne/oidc'
import { describe, expect, it } from 'vitest'
import { decideConsent, renderConsent } from './consent'
import { encodeSandboxCode, FakeOidcClient } from './FakeOidcClient'

const origin = 'http://localhost:3000'
const ada = { id: 'user-ada', email: 'ada@example.com', name: 'Ada Lovelace', description: 'owner of Acme Ltd' }

/** Plays the person at the consent screen: follows the authorize URL and chooses. */
function consent(url: string, choice: Record<string, string>) {
  const query = Object.fromEntries(new URL(url, origin).searchParams)
  return decideConsent({ ...query, ...choice }, [ada], origin)
}

describe('the sandbox sign-in round trip', () => {
  it('goes from the authorize URL, through consent, to an identity', async () => {
    const client = new FakeOidcClient()
    const request = await client.authorizationRequest({ redirectUri: '/api/auth/callback' })
    const decision = consent(request.url, { email: 'Grace@Example.com', name: 'Grace Hopper', verified: '1' })
    expect(decision.kind).toBe('redirect')
    const back = new URL((decision as { location: string }).location, origin)

    expect(back.pathname).toBe('/api/auth/callback')
    expect(back.searchParams.get('state')).toBe(request.state)
    expect(await client.complete(back.searchParams.get('code')!, request)).toEqual({
      issuer: 'sandbox',
      subject: 'sandbox|grace@example.com',
      email: 'Grace@Example.com',
      emailVerified: true,
      name: 'Grace Hopper',
      picture: null
    })
  })

  it('reports an email chosen as unverified', async () => {
    const client = new FakeOidcClient()
    const request = await client.authorizationRequest()
    const decision = consent(request.url, { email: 'new@example.com' })
    const code = new URL((decision as { location: string }).location, origin).searchParams.get('code')!

    expect((await client.complete(code, request)).emailVerified).toBe(false)
  })

  it('signs a hinted dev user straight in', async () => {
    const request = await new FakeOidcClient().authorizationRequest({ loginHint: 'ada@example.com' })

    expect(consent(request.url, {}).kind).toBe('redirect')
  })

  it('asks when nobody has been chosen', async () => {
    const request = await new FakeOidcClient().authorizationRequest({ loginHint: 'stranger@example.com' })
    const decision = consent(request.url, {})

    expect(decision.kind).toBe('ask')
    expect(renderConsent(decision as Extract<typeof decision, { kind: 'ask' }>)).toContain('name="email"')
  })

  it('rejects a code made for another round trip', async () => {
    const request = await new FakeOidcClient().authorizationRequest()

    await expect(new FakeOidcClient().complete(encodeSandboxCode({ nonce: 'other', email: 'a@example.com', name: null, emailVerified: true }), request))
      .rejects.toThrow(OidcError)
    await expect(new FakeOidcClient().complete('not-a-code', request)).rejects.toThrow(OidcError)
  })
})

describe('decideConsent', () => {
  it.each(['https://evil.example.com/steal', '//evil.example.com/steal', '/\\evil.example.com'])('refuses to send anyone to %s', (target) => {
    expect(decideConsent({ state: 's', nonce: 'n', redirect_uri: target, email: 'a@example.com' }, [], origin).kind).toBe('invalid')
  })

  it('accepts an absolute URL on the app\'s own origin', () => {
    const decision = decideConsent({ state: 's', nonce: 'n', redirect_uri: `${origin}/api/auth/callback`, email: 'a@example.com' }, [], origin)

    expect(decision).toMatchObject({ kind: 'redirect', location: expect.stringMatching(/^http:\/\/localhost:3000\/api\/auth\/callback\?code=/) })
  })

  it('needs the round trip\'s state, nonce and redirect URI', () => {
    expect(decideConsent({ email: 'a@example.com' }, [], origin).kind).toBe('invalid')
  })

  it('escapes what it renders', () => {
    const html = renderConsent({ kind: 'ask', state: '"><script>', nonce: 'n', redirectUri: '/cb"><b>', devUsers: [] })

    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>')
  })
})
