// No script-src or style-src yet: Nuxt's SSR and Nuxt UI's colour mode inline
// scripts, which need nonces first. A route that sets its own headers, such as
// the media route's stricter CSP, overrides these, since its handler runs later.
const headers: Record<string, string> = {
  'content-security-policy': 'frame-ancestors \'none\'; base-uri \'self\'; object-src \'none\'; form-action \'self\'',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  ...(import.meta.dev ? {} : { 'strict-transport-security': 'max-age=31536000; includeSubDomains' })
}

export default defineEventHandler((event) => {
  setResponseHeaders(event, headers)
})
