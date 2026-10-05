import { describe, expect, it } from 'vitest'
import { SanitizeHtmlSanitizer } from './SanitizeHtmlSanitizer'

const sanitize = (html: string) => new SanitizeHtmlSanitizer().sanitize(html)

describe('SanitizeHtmlSanitizer', () => {
  it('keeps what the editor makes', () => {
    const html = '<h2>Title</h2><p style="text-align:center"><strong>Bold</strong> and <em>italic</em></p><ul><li>One</li></ul>'

    expect(sanitize(html)).toBe(html)
  })

  it('drops scripts, handlers and embeds', () => {
    expect(sanitize('<p onclick="x()">Hi</p><script>alert(1)</script><iframe src="https://evil.example.com"></iframe>')).toBe('<p>Hi</p>')
  })

  it('keeps only same-site image sources', () => {
    expect(sanitize('<img src="/media/workspaces/w/2026/06/a.png" alt="shot">')).toBe('<img src="/media/workspaces/w/2026/06/a.png" alt="shot" />')
    expect(sanitize('<img src="https://tracker.example.com/pixel.gif">')).toBe('<img />')
    expect(sanitize('<img src="//tracker.example.com/pixel.gif">')).toBe('<img />')
    expect(sanitize('<img src="data:image/png;base64,AAAA">')).toBe('<img />')
  })

  it('opens links in a new tab without a referrer to the opener', () => {
    expect(sanitize('<a href="https://example.com">x</a>')).toBe('<a href="https://example.com" target="_blank" rel="noopener noreferrer">x</a>')
    expect(sanitize('<a href="javascript:alert(1)">x</a>')).toBe('<a target="_blank" rel="noopener noreferrer">x</a>')
  })
})
