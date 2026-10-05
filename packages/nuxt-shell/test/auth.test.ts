import { $fetch } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import type { MeResponse } from '../shared/contracts/me'
import { Browser, fakeCode } from './browser'
import { setupLayer } from './setup'

await setupLayer()

describe('GET /api/auth/login', () => {
  it('redirects to the provider with fresh state, passing a login hint', async () => {
    const browser = new Browser()
    const first = await browser.startSignIn('ada@example.com')
    const second = await browser.startSignIn()

    expect(first.origin + first.pathname).toBe('https://idp.test/authorize')
    expect(first.searchParams.get('login_hint')).toBe('ada@example.com')
    expect(first.searchParams.get('redirect_uri')).toMatch(/^http:\/\/[^/]+\/api\/auth\/callback$/)
    expect(second.searchParams.get('state')).not.toBe(first.searchParams.get('state'))
  })
})

describe('GET /api/auth/callback', () => {
  it('signs a new person up, starts a session and goes home', async () => {
    const browser = new Browser()
    const response = await browser.signIn({ email: 'ada@example.com', name: 'Ada Lovelace' })
    const me = await browser.json<MeResponse>('/api/me')

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/')
    expect(me.body).toMatchObject({ displayName: 'Ada Lovelace', email: 'ada@example.com', isPlatformAdmin: false, identities: [{ provider: 'test' }] })
  })

  it('rejects a state that doesn\'t match the one this browser started with', async () => {
    const browser = new Browser()
    const authorize = await browser.startSignIn()
    const response = await browser.callback('forged-state', fakeCode({ nonce: authorize.searchParams.get('nonce')!, email: 'eve@example.com' }))

    expect(response.status).toBe(400)
    expect((await browser.json('/api/me')).status).toBe(401)
  })

  it('rejects a callback this browser never started', async () => {
    const response = await new Browser().callback('state-x', fakeCode({ nonce: 'nonce-x', email: 'eve@example.com' }))

    expect(response.status).toBe(400)
  })

  it('can\'t be replayed, because the round trip ends on first use', async () => {
    const browser = new Browser()
    const authorize = await browser.startSignIn()
    const state = authorize.searchParams.get('state')!
    const code = fakeCode({ nonce: authorize.searchParams.get('nonce')!, email: 'once@example.com' })
    await browser.callback(state, code)

    expect((await browser.callback(state, code)).status).toBe(400)
  })

  it.each([
    ['an unverified email', { email: 'unverified@example.com', emailVerified: false }, 'email-not-verified'],
    ['a code the provider rejects', { email: 'bad@example.com', nonce: 'wrong' }, 'provider']
  ])('sends %s back to login with a reason', async (_, claims, reason) => {
    const browser = new Browser()
    const authorize = await browser.startSignIn()
    const response = await browser.callback(authorize.searchParams.get('state')!, fakeCode({ nonce: authorize.searchParams.get('nonce')!, ...claims }))

    expect(response.headers.get('location')).toBe(`/login?error=${reason}`)
  })

  it('sends a sign-in the person cancelled back to login', async () => {
    const browser = new Browser()
    await browser.startSignIn()
    const response = await browser.request('/api/auth/callback?error=access_denied')

    expect(response.headers.get('location')).toBe('/login?error=cancelled')
  })
})

describe('a deactivated user', () => {
  it('is sent back to login, and their open session stops working', async () => {
    const before = new Browser()
    await before.signIn({ email: 'dana@example.com' })
    expect((await before.json('/api/me')).status).toBe(200)

    await $fetch('/__test/deactivate', { method: 'POST', body: { email: 'dana@example.com' } })

    expect((await before.json('/api/me')).status).toBe(401)
    expect((await new Browser().signIn({ email: 'dana@example.com' })).headers.get('location')).toBe('/login?error=deactivated')
  })
})

describe('POST /api/auth/logout', () => {
  it('ends the session', async () => {
    const browser = new Browser()
    await browser.signIn({ email: 'grace@example.com' })
    const response = await browser.request('/api/auth/logout', { method: 'POST' })

    expect(response.status).toBe(204)
    expect((await browser.json('/api/me')).status).toBe(401)
  })
})

describe('GET /api/me', () => {
  it('needs a signed-in user', async () => {
    expect((await new Browser().json('/api/me')).status).toBe(401)
  })
})
