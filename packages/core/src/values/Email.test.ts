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

  it('accepts an internationalised domain in its xn-- form', () => {
    expect(parseEmail('ada@xn--crp-sna.com')).toBe('ada@xn--crp-sna.com')
  })

  it.each([
    ['empty', ''],
    ['no at sign', 'ada.example.com'],
    ['no domain dot', 'ada@example'],
    ['inner whitespace', 'ada lovelace@example.com'],
    ['inner tab', 'ada\tlovelace@example.com'],
    ['two at signs', 'ada@lovelace@example.com'],
    ['an accented local part', 'jöhn@corp.com'],
    ['an accented domain', 'john@cörp.com'],
    ['a look-alike Cyrillic letter', 'j\u043Ehn@corp.com'],
    ['too long', `${'a'.repeat(EMAIL_MAX_LENGTH)}@example.com`]
  ])('rejects %s', (_, input) => {
    expect(() => parseEmail(input)).toThrow(InvalidEmailError)
  })
})
