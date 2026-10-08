import { fetch } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { setupLayer } from './setup'

await setupLayer()

describe('security headers', () => {
  it.each([
    ['a page', '/login'],
    ['an API response', '/api/me'],
    ['an error', '/api/no-such-route']
  ])('come with %s', async (_, path) => {
    const response = await fetch(path, { redirect: 'manual' })

    expect(response.headers.get('content-security-policy')).toBe('frame-ancestors \'none\'; base-uri \'self\'; object-src \'none\'; form-action \'self\'')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    expect(response.headers.get('permissions-policy')).toBe('camera=(), microphone=(), geolocation=(), payment=(), usb=()')
    expect(response.headers.get('strict-transport-security')).toBe('max-age=31536000; includeSubDomains')
  })
})
