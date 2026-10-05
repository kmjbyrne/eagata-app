import type { DevUser } from '../utils/sandbox'
import { encodeSandboxCode } from './FakeOidcClient'

export interface ConsentQuery {
  state?: string
  nonce?: string
  redirect_uri?: string
  login_hint?: string
  /** Set once the person has chosen. */
  email?: string
  name?: string
  /** "1" when the chosen email counts as verified. */
  verified?: string
}

export type ConsentDecision
  = | { kind: 'invalid', message: string }
    | { kind: 'ask', state: string, nonce: string, redirectUri: string, devUsers: DevUser[] }
    | { kind: 'redirect', location: string }

/**
 * What the consent screen does: send the person straight back when they've
 * chosen (or a login hint names a dev user), else ask. It only sends people
 * back to the app itself, so it can't be used to redirect elsewhere.
 */
export function decideConsent(query: ConsentQuery, devUsers: DevUser[], origin: string): ConsentDecision {
  const { state, nonce, redirect_uri: redirectUri } = query
  if (!state || !nonce || !redirectUri) {
    return { kind: 'invalid', message: 'state, nonce and redirect_uri are required' }
  }
  if (!isSameOrigin(redirectUri, origin)) {
    return { kind: 'invalid', message: 'redirect_uri must point at this app' }
  }

  const hinted = query.login_hint && devUsers.find(user => user.email.toLowerCase() === query.login_hint!.toLowerCase())
  const chosen = query.email
    ? { email: query.email, name: query.name || null, emailVerified: query.verified === '1' }
    : hinted ? { email: hinted.email, name: hinted.name, emailVerified: true } : null
  if (!chosen) {
    return { kind: 'ask', state, nonce, redirectUri, devUsers }
  }

  const location = new URL(redirectUri, origin)
  location.searchParams.set('code', encodeSandboxCode({ nonce, ...chosen }))
  location.searchParams.set('state', state)
  return { kind: 'redirect', location: redirectUri.startsWith('/') ? `${location.pathname}${location.search}` : location.toString() }
}

function isSameOrigin(target: string, origin: string): boolean {
  if (target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\')) {
    return true
  }
  try {
    return new URL(target).origin === origin
  } catch {
    return false
  }
}

const escape = (value: string) => value.replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`)

/** A plain page, so it works with no app styles loaded. Dev users are on the login page's "Sign in as". */
export function renderConsent({ state, nonce, redirectUri }: Extract<ConsentDecision, { kind: 'ask' }>): string {
  return `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dev sign-in</title>
<style>body{font:16px system-ui;max-width:24rem;margin:4rem auto;padding:0 1rem}input,button{font:inherit;padding:.5rem;width:100%;box-sizing:border-box;margin-top:.5rem}label{display:flex;gap:.5rem;align-items:center;margin-top:.5rem}label input{width:auto;margin:0}</style>
<h1>Dev sign-in</h1>
<p>Stands in for the sign-in provider in development. Enter the email the account would report.</p>
<form method="get">
  <input type="hidden" name="state" value="${escape(state)}">
  <input type="hidden" name="nonce" value="${escape(nonce)}">
  <input type="hidden" name="redirect_uri" value="${escape(redirectUri)}">
  <input type="email" name="email" required autofocus placeholder="you@example.com">
  <input type="text" name="name" placeholder="Name (optional)">
  <label><input type="checkbox" name="verified" value="1" checked> The provider has verified this email</label>
  <button>Continue</button>
</form>`
}
