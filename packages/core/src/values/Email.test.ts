import { describe, expect, it } from 'vitest'
import { EMAIL_MAX_LENGTH, InvalidEmailError, parseEmail } from './Email'

describe('parseEmail', () => {
  it('trims and lowercases', () => {
    expect(parseEmail('  Ada@Example.COM ')).toBe('ada@example.com')
  })

  it('accepts the maximum length', () => {
    const input = `${'a'.repeat(EMAIL_MAX_LENGTH - '@example.com'.length)}@example.com`
    expect(parseEmail(input)).toBe(input)
  })

  it.each([
    ['empty', ''],
    ['no at sign', 'ada.example.com'],
    ['no domain dot', 'ada@example'],
    ['inner whitespace', 'ada lovelace@example.com'],
    ['too long', `${'a'.repeat(EMAIL_MAX_LENGTH)}@example.com`]
  ])('rejects %s', (_, input) => {
    expect(() => parseEmail(input)).toThrow(InvalidEmailError)
  })
})
