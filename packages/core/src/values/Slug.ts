import { InvalidInputError } from '../errors'

/** The short, URL-safe name of an org or workspace, as in `/acme/general`. */
export type Slug = string & { readonly __brand: 'Slug' }

export const SLUG_MIN_LENGTH = 3
export const SLUG_MAX_LENGTH = 32

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Org slugs sit at the top of every path, so none may match a route the app
 * serves there. Every fixed top-level route belongs in this list.
 */
export const RESERVED_ORG_SLUGS: readonly string[] = [
  '_nuxt',
  '_sandbox',
  'admin',
  'api',
  'auth',
  'choose',
  'help',
  'login',
  'logout',
  'new',
  'not-invited',
  'platform',
  'profile',
  'settings'
]

/** Dropped from the end of a name when suggesting a slug. */
const COMPANY_SUFFIXES = new Set(['co', 'company', 'corp', 'corporation', 'gmbh', 'inc', 'incorporated', 'limited', 'llc', 'ltd', 'plc'])

export class InvalidSlugError extends InvalidInputError {
  constructor(readonly input: string) {
    super(`A slug needs ${SLUG_MIN_LENGTH} to ${SLUG_MAX_LENGTH} lowercase letters, numbers and single hyphens, not starting or ending with a hyphen. Got "${input}"`)
  }
}

export class ReservedSlugError extends InvalidInputError {
  constructor(readonly slug: string) {
    super(`"${slug}" is reserved. Choose another slug`)
  }
}

export function parseSlug(input: string): Slug {
  const candidate = input.trim().toLowerCase()
  if (candidate.length < SLUG_MIN_LENGTH || candidate.length > SLUG_MAX_LENGTH || !SLUG_PATTERN.test(candidate)) {
    throw new InvalidSlugError(input)
  }
  return candidate as Slug
}

export function parseOrgSlug(input: string): Slug {
  const slug = parseSlug(input)
  if (RESERVED_ORG_SLUGS.includes(slug)) {
    throw new ReservedSlugError(slug)
  }
  return slug
}

/**
 * A valid slug for a name: accents dropped, words joined with hyphens, cut at
 * a word boundary, and company suffixes such as "Ltd" dropped from the end.
 * A name too short for a slug gets "-1" added.
 */
export function suggestSlug(name: string): Slug {
  const words = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  while (words.length > 1 && COMPANY_SUFFIXES.has(words.at(-1)!)) {
    words.pop()
  }
  if (!words.length) {
    throw new InvalidSlugError(name)
  }

  let slug = words[0]!.slice(0, SLUG_MAX_LENGTH)
  for (const word of words.slice(1)) {
    if (slug.length + 1 + word.length > SLUG_MAX_LENGTH) {
      break
    }
    slug += `-${word}`
  }
  if (slug.length < SLUG_MIN_LENGTH) {
    slug += '-1'
  }
  return parseSlug(slug)
}
