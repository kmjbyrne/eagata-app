import { describe, expect, it } from 'vitest'
import { cleanWordHtml } from './cleanWordHtml'

describe('cleanWordHtml', () => {
  it('leaves HTML that did not come from Word alone', () => {
    const html = '<p class="lead"><span style="color: red">Hi</span><!-- note --></p>'
    expect(cleanWordHtml(html)).toBe(html)
  })

  it('strips conditional comments, XML islands and style blocks', () => {
    const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><!--[if gte mso 9]><xml><w:WordDocument></w:WordDocument></xml><![endif]--><style>p.MsoNormal { margin: 0 }</style></head><body><p class="MsoNormal">Text</p></body></html>'
    expect(cleanWordHtml(html)).toBe('<html xmlns:o="urn:schemas-microsoft-com:office:office"><head></head><body><p>Text</p></body></html>')
  })

  it('removes o:p and other namespaced tags', () => {
    expect(cleanWordHtml('<p class="MsoNormal">One<o:p></o:p></p><p class="MsoNormal"><st1:place>Cavan</st1:place><o:p>&nbsp;</o:p></p>'))
      .toBe('<p>One</p><p>Cavan&nbsp;</p>')
  })

  it('drops mso style declarations but keeps the rest', () => {
    expect(cleanWordHtml('<p style="mso-margin-top-alt:auto;text-align:center">A</p><span style="mso-bidi-font-weight:normal">B</span>'))
      .toBe('<p style="text-align:center">A</p>B')
  })

  it('keeps non-Mso classes and drops lang attributes', () => {
    expect(cleanWordHtml('<p class="MsoListParagraph keep" lang="EN-IE">Item</p>'))
      .toBe('<p class="keep">Item</p>')
  })

  it('unwraps nested empty spans', () => {
    expect(cleanWordHtml('<p class="MsoNormal"><span lang="EN-GB"><span>Hello</span></span> <b>world</b></p>'))
      .toBe('<p>Hello <b>world</b></p>')
  })
})
