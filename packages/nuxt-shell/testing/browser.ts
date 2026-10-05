import { $fetch, fetch } from '@nuxt/test-utils/e2e'
import type { FakeCode } from './server/FakeSignInProvider'

/** A test client that keeps cookies between requests, as a browser does. */
export class Browser {
  private readonly cookies = new Map<string, string>()

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const response = await fetch(path, {
      ...init,
      redirect: 'manual',
      headers: { ...init.headers as Record<string, string>, cookie: [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ') }
    })
    for (const header of response.headers.getSetCookie()) {
      const [pair, ...attributes] = header.split(';')
      const [name, value = ''] = pair!.split('=')
      const expired = attributes.some(attribute => /max-age=0|expires=thu, 01 jan 1970/i.test(attribute.trim()))
      if (expired || !value) {
        this.cookies.delete(name!.trim())
      } else {
        this.cookies.set(name!.trim(), value)
      }
    }
    return response
  }

  async json<T>(path: string, init?: RequestInit): Promise<{ status: number, body: T }> {
    const response = await this.request(path, init)
    return { status: response.status, body: await response.json().catch(() => null) as T }
  }

  /** Starts a sign-in and returns the provider URL it redirected to. */
  async startSignIn(hint?: string): Promise<URL> {
    const response = await this.request(`/api/auth/login${hint ? `?hint=${encodeURIComponent(hint)}` : ''}`)
    return new URL(response.headers.get('location')!)
  }

  /** Signs in end to end, as the provider would let this person through. */
  async signIn(person: Partial<Omit<FakeCode, 'nonce'>> & { email: string }): Promise<Response> {
    const authorize = await this.startSignIn()
    return this.callback(authorize.searchParams.get('state')!, fakeCode({ nonce: authorize.searchParams.get('nonce')!, ...person }))
  }

  callback(state: string, code: string): Promise<Response> {
    return this.request(`/api/auth/callback?${new URLSearchParams({ state, code })}`)
  }
}

/** Sets up a user as a platform admin would, so they can sign in. */
export function createUser(email: string, name?: string): Promise<{ id: string }> {
  return $fetch('/__test/user', { method: 'POST', body: { email, name } })
}

export function fakeCode(claims: Partial<FakeCode> & { nonce: string, email: string }): string {
  const code: FakeCode = { subject: `sub|${claims.email}`, emailVerified: true, name: null, ...claims }
  return Buffer.from(JSON.stringify(code)).toString('base64url')
}
