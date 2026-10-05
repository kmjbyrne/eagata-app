import { describe, expect, it } from 'vitest'
import { OIDC_PRESETS } from './presets'

describe('OIDC_PRESETS', () => {
  it('knows Google', () => {
    expect(OIDC_PRESETS.google).toEqual({ issuer: 'https://accounts.google.com', issuerAliases: ['accounts.google.com'] })
  })
})
