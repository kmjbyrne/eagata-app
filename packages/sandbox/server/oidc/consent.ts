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

/** A plain page, so it works with no app styles loaded. */
export function renderConsent({ state, nonce, redirectUri, devUsers }: Extract<ConsentDecision, { kind: 'ask' }>): string {
  const hidden = `<input type="hidden" name="state" value="${escape(state)}"><input type="hidden" name="nonce" value="${escape(nonce)}"><input type="hidden" name="redirect_uri" value="${escape(redirectUri)}">`
  const people = devUsers.map(user => `
    <form method="get">${hidden}
      <input type="hidden" name="email" value="${escape(user.email)}">
      <input type="hidden" name="name" value="${escape(user.name)}">
      <input type="hidden" name="verified" value="1">
      <button><strong>${escape(user.name)}</strong><span>${escape(user.email)}${user.description ? ` · ${escape(user.description)}` : ''}</span></button>
    </form>`).join('')
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sandbox sign-in</title>
<style>
  body { font: 15px/1.4 system-ui, sans-serif; max-width: 28rem; margin: 3rem auto; padding: 0 1rem; color: #1f2937 }
  h1 { font-size: 1.25rem } p { color: #6b7280 }
  button { display: flex; flex-direction: column; align-items: flex-start; width: 100%; padding: .6rem .8rem; margin: .4rem 0; font: inherit; text-align: left; background: #fff; border: 1px solid #d1d5db; border-radius: .5rem; cursor: pointer }
  button:hover { border-color: #6b7280 } button span { color: #6b7280; font-size: .85rem }
  fieldset { border: 1px solid #d1d5db; border-radius: .5rem; margin-top: 1.5rem } label { display: block; margin: .5rem 0 }
  input[type=email], input[type=text] { width: 100%; padding: .5rem; font: inherit; box-sizing: border-box }
</style>
<h1>Sandbox sign-in</h1>
<p>Stands in for the sign-in provider during development. Choose who to be.</p>
${people}
<form method="get">${hidden}
  <fieldset>
    <legend>Someone else</legend>
    <label>Email <input type="email" name="email" required placeholder="someone@example.com"></label>
    <label>Name <input type="text" name="name" placeholder="Optional"></label>
    <label><input type="checkbox" name="verified" value="1" checked> The provider has verified this email</label>
    <button><strong>Continue</strong></button>
  </fieldset>
</form>
</html>`
}
