import { describe, expect, it } from 'vitest'
import { InvalidNameError, NAME_MAX_LENGTH, parseName } from './Name'

describe('parseName', () => {
  it('trims and collapses whitespace', () => {
    expect(parseName('  Ada   Lovelace ')).toBe('Ada Lovelace')
  })

  it('accepts the maximum length', () => {
    expect(parseName('a'.repeat(NAME_MAX_LENGTH))).toHaveLength(NAME_MAX_LENGTH)
  })

  it.each([
    ['empty', ''],
    ['only whitespace', '   '],
    ['too long', 'a'.repeat(NAME_MAX_LENGTH + 1)]
  ])('rejects %s', (_, input) => {
    expect(() => parseName(input)).toThrow(InvalidNameError)
  })
})
