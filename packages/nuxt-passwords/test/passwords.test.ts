import { fileURLToPath } from 'node:url'
import type { EmailMessage } from '@kmjbyrne/core'
import { $fetch } from '@nuxt/test-utils/e2e'
import { Browser, createUser, setupApp } from '@kmjbyrne/nuxt-shell/testing'
import { describe, expect, it } from 'vitest'
import type { PasswordStatusResponse, PendingLinkResponse } from '../shared/contracts/passwords'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

await setupApp(here('..'), { runtimeConfig: { appUrl: 'https://app.example.com' } }, {
  plugins: [here('./server/testPasswords.ts')],
  handlers: [
    { route: '/__test/outbox', method: 'get', handler: here('./server/outbox.get.ts') },
    { route: '/__test/password', method: 'post', handler: here('./server/password.post.ts') }
  ]
})

const send = (method: string, body?: unknown) =>
  ({ method, ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}) })

async function userWithPassword(email: string, password = 'correct horse battery') {
  const user = await createUser(email)
  await $fetch('/__test/password', { method: 'POST', body: { email, password } })
  return user
}

/** The token in the newest email to `to`, once it has been sent. */
async function tokenSentTo(to: string): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const mail = (await $fetch<EmailMessage[]>('/__test/outbox')).filter(message => message.to === to).at(-1)
    if (mail) {
      return decodeURIComponent(/token=([^\s&]+)/.exec(mail.text)![1]!)
    }
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error(`No email to ${to}`)
}

describe('POST /api/auth/password', () => {
  it('signs in with the right password, and refuses a wrong one with 401', async () => {
    await userWithPassword('ada@example.com')
    const browser = new Browser()

    expect((await browser.request('/api/auth/password', send('POST', { email: 'ada@example.com', password: 'wrong password!' }))).status).toBe(401)
    expect((await browser.request('/api/auth/password', send('POST', { email: 'ada@example.com', password: 'correct horse battery' }))).status).toBe(204)
    expect((await browser.json('/api/me')).status).toBe(200)
  })
})

describe('Google sign-in for a user with a password', () => {
  it('asks for the password on /link-account, then links and signs in', async () => {
    await userWithPassword('grace@example.com')
    const browser = new Browser()
    const response = await browser.signIn({ email: 'grace@example.com' })

    expect(response.headers.get('location')).toBe('/link-account')
    expect((await browser.json('/api/me')).status).toBe(401)
    expect((await browser.json<PendingLinkResponse>('/api/auth/link')).body).toEqual({ email: 'grace@example.com', provider: 'test' })
    expect((await browser.request('/api/auth/link', send('POST', { password: 'wrong password!' }))).status).toBe(401)
    expect((await browser.request('/api/auth/link', send('POST', { password: 'correct horse battery' }))).status).toBe(204)
    expect((await browser.json<{ identities: unknown[] }>('/api/me')).body.identities).toHaveLength(1)
    expect((await new Browser().signIn({ email: 'grace@example.com' })).headers.get('location')).toBe('/')
  })

  it('signs a user without a password straight in', async () => {
    await createUser('alan@example.com')

    expect((await new Browser().signIn({ email: 'alan@example.com' })).headers.get('location')).toBe('/')
  })

  it('has nothing to link without a waiting sign-in', async () => {
    const browser = new Browser()

    expect((await browser.request('/api/auth/link')).status).toBe(404)
    expect((await browser.request('/api/auth/link', send('POST', { password: 'anything at all' }))).status).toBe(400)
  })
})

describe('password resets', () => {
  it('emails a link that sets the password and signs in', async () => {
    await createUser('mary@example.com')
    const browser = new Browser()

    expect((await browser.request('/api/auth/password/forgot', send('POST', { email: 'mary@example.com' }))).status).toBe(202)
    const token = await tokenSentTo('mary@example.com')
    expect((await browser.request('/api/auth/password/reset', send('POST', { token, password: 'a brand new one' }))).status).toBe(204)
    expect((await browser.json('/api/me')).status).toBe(200)
    expect((await new Browser().request('/api/auth/password', send('POST', { email: 'mary@example.com', password: 'a brand new one' }))).status).toBe(204)
    expect((await browser.request('/api/auth/password/reset', send('POST', { token, password: 'another new one' }))).status).toBe(400)
  })

  it('answers the same for an unknown email', async () => {
    expect((await new Browser().request('/api/auth/password/forgot', send('POST', { email: 'nobody@example.com' }))).status).toBe(202)
  })
})

describe('/api/me/password', () => {
  it('sets a first password, then changes it only with the current one', async () => {
    await createUser('katherine@example.com')
    const browser = new Browser()
    await browser.signIn({ email: 'katherine@example.com' })

    expect((await browser.json<PasswordStatusResponse>('/api/me/password')).body).toEqual({ hasPassword: false })
    expect((await browser.request('/api/me/password', send('PUT', { password: 'short' }))).status).toBe(400)
    expect((await browser.request('/api/me/password', send('PUT', { password: 'a brand new one' }))).status).toBe(204)
    expect((await browser.json<PasswordStatusResponse>('/api/me/password')).body).toEqual({ hasPassword: true })
    expect((await browser.request('/api/me/password', send('PUT', { password: 'another new one' }))).status).toBe(403)
    expect((await browser.request('/api/me/password', send('PUT', { current: 'a brand new one', password: 'another new one' }))).status).toBe(204)
  })

  it('needs a signed-in user', async () => {
    expect((await new Browser().request('/api/me/password')).status).toBe(401)
  })
})

describe('POST /api/protected/users/:id/password-invite', () => {
  it('lets only a platform admin email a set-password link', async () => {
    await createUser('pat@example.com')
    await $fetch('/__test/platform-admin', { method: 'POST', body: { email: 'pat@example.com' } })
    const dana = await createUser('dana@example.com')
    const pat = new Browser()
    await pat.signIn({ email: 'pat@example.com' })
    const outsider = new Browser()
    await outsider.signIn({ email: 'dana@example.com' })

    expect((await outsider.request(`/api/protected/users/${dana.id}/password-invite`, send('POST'))).status).toBe(403)
    expect((await pat.request(`/api/protected/users/${dana.id}/password-invite`, send('POST'))).status).toBe(202)
    expect(await tokenSentTo('dana@example.com')).toBeTruthy()
  })
})

describe('signed-out pages', () => {
  it.each(['/forgot-password', '/reset-password', '/link-account'])('serves %s without signing in', async (path) => {
    expect((await new Browser().request(path)).status).toBe(200)
  })
})
