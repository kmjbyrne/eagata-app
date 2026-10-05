// The slug rules, shared with the browser so forms check and suggest exactly
// as the server does. Re-exported rather than copied, so they can't drift.
export { SLUG_MAX_LENGTH, SLUG_MIN_LENGTH, suggestSlug } from '@kmjbyrne/core'

export const SLUG_RULES = 'Slugs have 3 to 32 lowercase letters, numbers and single hyphens, and don\'t start or end with a hyphen.'
