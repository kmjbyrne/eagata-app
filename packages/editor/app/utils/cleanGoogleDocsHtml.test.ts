// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cleanGoogleDocsHtml, unwrapGoogleRedirect } from './cleanGoogleDocsHtml'

const WRAP = (inner: string) => `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1">${inner}</b>`
const SPAN = (style: string, text: string) => `<span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;${style}white-space:pre-wrap;">${text}</span>`

describe('cleanGoogleDocsHtml', () => {
  it('leaves HTML that did not come from Google Docs alone', () => {
    const html = '<p style="color: red"><span style="font-weight:700">Hi</span></p>'
    expect(cleanGoogleDocsHtml(html)).toBe(html)
  })

  it('turns style-only formatting into tags and drops default styles', () => {
    const html = WRAP(`<p dir="ltr" style="line-height:1.38;margin-top:0pt;">${SPAN('font-weight:400;', 'We had a ')}${SPAN('font-weight:700;', 'brilliant')}${SPAN('font-style:italic;', ' day')}${SPAN('text-decoration:line-through;', ' old')}${SPAN('vertical-align:super;', 'rd')}</p>`)
    expect(cleanGoogleDocsHtml(html)).toBe('<p>We had a <strong>brilliant</strong><em> day</em><s> old</s><sup>rd</sup></p>')
  })

  it('keeps highlights and non-default colours', () => {
    const html = WRAP(`<p>${SPAN('background-color:#ffff00;', 'marked')}<span style="color:#cc0000;font-weight:700;">red</span></p>`)
    expect(cleanGoogleDocsHtml(html)).toBe('<p><span style="background-color: #ffff00">marked</span><span style="color: #cc0000"><strong>red</strong></span></p>')
  })

  it('unwraps redirect links and drops the default link styling', () => {
    const html = WRAP(`<p><a href="https://www.google.com/url?q=https://www.ballyconnellns.ie/news&amp;sa=D&amp;usg=x" style="text-decoration:none;"><span style="color:#1155cc;text-decoration:underline;">news</span></a></p>`)
    expect(cleanGoogleDocsHtml(html)).toBe('<p><a href="https://www.ballyconnellns.ie/news">news</a></p>')
  })

  it('keeps centred and right-aligned paragraphs', () => {
    const html = WRAP(`<p dir="ltr" style="line-height:1.38;text-align:center;">${SPAN('', 'Centred')}</p><p style="text-align:left;">${SPAN('', 'Left')}</p>`)
    expect(cleanGoogleDocsHtml(html)).toBe('<p style="text-align: center">Centred</p><p>Left</p>')
  })

  it('removes line breaks between blocks, table widths and image styles', () => {
    const cleaned = cleanGoogleDocsHtml(readFileSync(resolve('packages/editor/app/utils/__fixtures__/google-docs-paste.html'), 'utf8'))
    expect(cleaned).not.toMatch(/docs-internal-guid|<br|<colgroup|style="[^"]*(font-size|line-height|margin|border)/)
    expect(cleaned).toContain('<h2>Sports Day 2026</h2>')
    expect(cleaned).toContain('<ul><li><p>Sack race</p></li><li><p>Egg and spoon</p></li></ul>')
    expect(cleaned).toContain('<p><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXfakeImageKey?key=fakeKey" width="602" height="339"></p>')
    expect(cleaned).toContain('<table><tbody><tr><td><p><strong>Class</strong></p></td>')
  })
})

describe('cleanGoogleDocsHtml with a real Google Docs paste', () => {
  const cleaned = cleanGoogleDocsHtml(readFileSync(resolve('packages/editor/app/utils/__fixtures__/google-docs-recipe.html'), 'utf8'))

  it('recognises Google Docs by the id on its first block', () => {
    expect(cleaned).toContain('<h1>Ghorkali Special</h1>')
    expect(cleaned).not.toContain('docs-internal-guid')
  })

  it('rejoins a list Google split into several', () => {
    expect(cleaned.match(/<ul>/g)).toHaveLength(1)
    expect(cleaned).toContain('<li><p>2 tbsp oil or ghee.</p></li><li><p>1 tsp ground cumin.</p></li><li><p>1 tsp turmeric.</p></li><li><p>1 tbsp lemon juice.</p></li>')
  })

  it('moves a stray sublist into the item before it', () => {
    expect(cleaned).toContain('<li><p>Add water or stock, cover, and simmer.</p><ol><li><p>(Optional) Blend the gravy&nbsp;</p></li></ol></li><li><p>Stir in the cream.</p></li>')
  })

  it('keeps the embedded image for the editor to save', () => {
    expect(cleaned).toMatch(/<p><img src="data:image\/png;base64,[^"]+" width="388" height="430"><\/p>/)
  })
})

describe('unwrapGoogleRedirect', () => {
  it('returns the target of a Google redirect', () => {
    expect(unwrapGoogleRedirect('https://www.google.com/url?q=https://example.ie/a%3Fb%3D1&sa=D')).toBe('https://example.ie/a?b=1')
  })

  it('leaves other links alone', () => {
    expect(unwrapGoogleRedirect('https://example.ie/url?q=x')).toBe('https://example.ie/url?q=x')
    expect(unwrapGoogleRedirect('/news')).toBe('/news')
  })
})
