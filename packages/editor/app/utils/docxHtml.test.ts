import { describe, expect, it } from 'vitest'
import { finishDocxHtml, isDocx } from './docxHtml'

describe('finishDocxHtml', () => {
  it('swaps placeholders for uploaded URLs and sets the landscape class', () => {
    const html = '<p>Before</p><p><img alt="A picture" src="docx-image-1" /></p><p><img src="docx-image-2" /></p>'
    const sources = new Map([['docx-image-1', 'https://cdn/a.png'], ['docx-image-2', 'https://cdn/b.jpeg']])
    expect(finishDocxHtml(html, sources)).toBe('<p>Before</p><img src="https://cdn/a.png" class="article-image-override" alt="A picture"><img src="https://cdn/b.jpeg" class="article-image-override">')
  })

  it('keeps images that share a paragraph with text inside it', () => {
    expect(finishDocxHtml('<p>Logo <img src="docx-image-1" /></p>', new Map([['docx-image-1', '/logo.png']])))
      .toBe('<p>Logo <img src="/logo.png" class="article-image-override"></p>')
  })

  it('leaves unknown sources in place', () => {
    expect(finishDocxHtml('<img src="https://elsewhere/x.png">', new Map()))
      .toBe('<img src="https://elsewhere/x.png" class="article-image-override">')
  })
})

describe('isDocx', () => {
  it('accepts the Word MIME type or a .docx name', () => {
    expect(isDocx(new File([], 'a.bin', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))).toBe(true)
    expect(isDocx(new File([], 'Report.DOCX'))).toBe(true)
    expect(isDocx(new File([], 'photo.png', { type: 'image/png' }))).toBe(false)
  })
})
