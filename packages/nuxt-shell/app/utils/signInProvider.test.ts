import { describe, expect, it } from 'vitest'
import { signInProviderDisplay } from './signInProvider'

describe('signInProviderDisplay', () => {
  it('names a known provider', () => {
    expect(signInProviderDisplay('google')).toEqual({ name: 'Google', label: 'Continue with Google' })
    expect(signInProviderDisplay('janus')).toEqual({ name: 'Janus', label: 'Continue with Janus' })
  })

  it('names any other provider after its key', () => {
    expect(signInProviderDisplay('okta')).toEqual({ name: 'Okta', label: 'Continue with Okta' })
  })

  it('prefers a configured label', () => {
    expect(signInProviderDisplay('janus', 'Sign in with your work account'))
      .toEqual({ name: 'Janus', label: 'Sign in with your work account' })
  })
})
