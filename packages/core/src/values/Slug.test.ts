import { describe, expect, it } from 'vitest'
import {
  InvalidSlugError,
  parseOrgSlug,
  parseSlug,
  RESERVED_ORG_SLUGS,
  ReservedSlugError,
  SLUG_MAX_LENGTH,
  suggestSlug
} from './Slug'

describe('parseSlug', () => {
  it.each(['abc', 'acme', 'acme-2', 'a1-b2-c3', 'a'.repeat(SLUG_MAX_LENGTH)])('accepts %s', (input) => {
    expect(parseSlug(input)).toBe(input)
  })

  it('trims and lowercases', () => {
    expect(parseSlug(' Acme ')).toBe('acme')
  })

  it.each([
    ['too short', 'ab'],
    ['too long', 'a'.repeat(SLUG_MAX_LENGTH + 1)],
    ['a leading hyphen', '-acme'],
    ['a trailing hyphen', 'acme-'],
    ['a double hyphen', 'ac--me'],
    ['an underscore', 'ac_me'],
    ['a space', 'ac me'],
    ['an accent', 'café']
  ])('rejects %s', (_, input) => {
    expect(() => parseSlug(input)).toThrow(InvalidSlugError)
  })
})

describe('parseOrgSlug', () => {
  it.each(RESERVED_ORG_SLUGS.filter(slug => /^[a-z0-9-]+$/.test(slug)))('rejects the reserved slug %s', (slug) => {
    expect(() => parseOrgSlug(slug)).toThrow(ReservedSlugError)
  })

  it('accepts a reserved word as a workspace slug', () => {
    expect(parseSlug('settings')).toBe('settings')
  })
})

describe('suggestSlug', () => {
  it.each([
    ['Acme', 'acme'],
    ['Acme Widgets', 'acme-widgets'],
    ['  Acme   &  Sons!  ', 'acme-sons'],
    ['Café Ólafsson', 'cafe-olafsson'],
    ['Acme Ltd', 'acme'],
    ['Acme Ltd.', 'acme'],
    ['Acme Holdings Limited', 'acme-holdings'],
    ['Acme, Inc.', 'acme'],
    ['Acme LLC', 'acme'],
    ['Limited Editions', 'limited-editions'],
    ['LLC', 'llc'],
    ['AB', 'ab-1'],
    ['X', 'x-1'],
    ['The International Brotherhood of Widget Makers', 'the-international-brotherhood-of'],
    ['Supercalifragilisticexpialidocious Widgets', 'supercalifragilisticexpialidocio']
  ])('suggests %s as %s', (name, slug) => {
    expect(suggestSlug(name)).toBe(slug)
  })

  it('always suggests a valid slug', () => {
    for (const name of ['a', 'Ab Ltd', 'Ünïcødé Wörks GmbH', '123 456 789 012 345 678 901 234 567']) {
      expect(() => parseSlug(suggestSlug(name))).not.toThrow()
    }
  })

  it('throws for a name with nothing to make a slug from', () => {
    expect(() => suggestSlug('!!!')).toThrow(InvalidSlugError)
  })
})
