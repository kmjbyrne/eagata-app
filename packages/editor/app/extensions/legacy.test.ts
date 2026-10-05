// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"disableIframePageLoading":true,"disableJavaScriptFileLoading":true,"disableCSSFileLoading":true}}
import { generateHTML, generateJSON } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'
import { contentExtensions } from './schema'

// Mirrors the StarterKit options EditorContent passes to UEditor.
const extensions = [
  StarterKit.configure({ code: false, horizontalRule: false, link: { openOnClick: false, HTMLAttributes: { target: null, rel: null } } }),
  ...contentExtensions()
]

function roundTrip(html: string) {
  return generateHTML(generateJSON(html, extensions), extensions)
}

// Samples taken from content.body (see pnpm content:audit).
describe('legacy content round trip', () => {
  it('keeps image variants, alt and inline style', () => {
    const html = roundTrip('<p><img class="article-image-override" style="width: 462px; height: 241px;" src="https://s3.eu-west-1.amazonaws.com/bns.assets/public/images/2020/june/unnamed-6.jpg" alt="" /></p>'
      + '<p><img class="article-image-custom-override" src="https://s3/pumpkins.jpg" alt="Pumpkins" /></p>'
      + '<p><img class="article-image-portrait" src="https://s3/p.jpg" alt="" width="324" height="188" /></p>')
    expect(html).toContain('<img src="https://s3.eu-west-1.amazonaws.com/bns.assets/public/images/2020/june/unnamed-6.jpg" alt="" class="article-image-override" style="width: 462px; height: 241px;">')
    expect(html).toContain('class="article-image-custom-override"')
    expect(html).toContain('alt="Pumpkins"')
    expect(html).toContain('width="324" height="188" class="article-image-portrait"')
  })

  it('lifts images out of their paragraphs without leaving empty ones', () => {
    expect(roundTrip('<p>Intro</p><p><img class="article-image-override" src="https://s3/a.jpg" alt="" /></p><p><img src="https://s3/b.jpg" /> <img src="https://s3/c.jpg" /></p><p>Outro</p>'))
      .toBe('<p>Intro</p><img src="https://s3/a.jpg" alt="" class="article-image-override"><img src="https://s3/b.jpg"><img src="https://s3/c.jpg"><p>Outro</p>')
  })

  it('keeps text around an image in a paragraph', () => {
    expect(roundTrip('<p>Logo <img src="https://s3/logo.png" /></p>')).toContain('Logo')
  })

  it('drops unknown image classes but keeps the image', () => {
    expect(roundTrip('<img class="CToWUd a6T" src="https://mail/x.png">')).toBe('<img src="https://mail/x.png">')
  })

  it('keeps an inline base64 image', () => {
    expect(roundTrip('<p><img src="data:image/png;base64,iVBORw0KGgo=" /></p>')).toBe('<img src="data:image/png;base64,iVBORw0KGgo=">')
  })

  it('keeps figures with captions', () => {
    const html = roundTrip('<figure class="image"><img class="article-image-override" src="https://s3/an-fhoireann-bhuach.jpeg" alt="" />\n<figcaption>An Fhoireann Bhuach</figcaption>\n</figure>')
    expect(html).toBe('<figure class="image"><img src="https://s3/an-fhoireann-bhuach.jpeg" alt="" class="article-image-override"><figcaption>An Fhoireann Bhuach</figcaption></figure>')
  })

  it('keeps video with its source', () => {
    const html = roundTrip('<video class="video-container-element" controls>\n<source src="https://s3.eu-west-1.amazonaws.com/bns.assets/public/multimedia/video-1607437271.mp4" type="video/mp4">\nYour browser does not support the video tag.\n</video>')
    expect(html).toBe('<video class="video-container-element" controls=""><source src="https://s3.eu-west-1.amazonaws.com/bns.assets/public/multimedia/video-1607437271.mp4" type="video/mp4"></video>')
  })

  it('keeps YouTube and Google Drive iframes', () => {
    expect(roundTrip('<p><iframe title="YouTube video player" src="https://www.youtube.com/embed/wGhfdLLDaec" width="560" height="315" frameborder="0" allowfullscreen="allowfullscreen"></iframe></p>'))
      .toContain('<iframe src="https://www.youtube.com/embed/wGhfdLLDaec" width="560" height="315" title="YouTube video player" frameborder="0" allowfullscreen="allowfullscreen"></iframe>')
    expect(roundTrip('<iframe src="https://drive.google.com/file/d/1ocMVaGjJ/preview" width="640" height="480"></iframe>'))
      .toBe('<iframe src="https://drive.google.com/file/d/1ocMVaGjJ/preview" width="640" height="480"></iframe>')
  })

  it('keeps superscript ordinals', () => {
    expect(roundTrip('<p>Before long, 3<sup>rd</sup> class moved in.</p>')).toBe('<p>Before long, 3<sup>rd</sup> class moved in.</p>')
  })

  it('keeps text colour and background colour on spans', () => {
    const html = roundTrip('<p><span style="font-size: 18pt; font-family: Cambria,serif; color: #ff0000; background-color: #fbeeb8;">Prayer boxes</span></p>')
    expect(html).toContain('color: #ff0000')
    expect(html).toContain('background-color: #fbeeb8')
    expect(html).toContain('Prayer boxes')
  })

  it('keeps paragraph alignment', () => {
    expect(roundTrip('<p style="text-align: center;">Centred</p>')).toBe('<p style="text-align: center;">Centred</p>')
  })

  it('keeps links with their target and rel, and adds none', () => {
    expect(roundTrip('<p><a href="https://layasupertroopers.ie/" target="_blank" rel="noopener">Laya</a> and <a href="https://www.gonoodle.com/">GoNoodle</a></p>'))
      .toBe('<p><a target="_blank" rel="noopener" href="https://layasupertroopers.ie/">Laya</a> and <a href="https://www.gonoodle.com/">GoNoodle</a></p>')
  })

  it('keeps tables with colspan', () => {
    const html = roundTrip('<table class="datatable" border="1"><tbody><tr><th>Role</th><th>Name</th></tr><tr><td colspan="2" style="text-align: left; padding: 1rem;">Board of Management</td></tr></tbody></table>')
    expect(html).toContain('<th colspan="1" rowspan="1"><p>Role</p></th>')
    expect(html).toContain('<td colspan="2" rowspan="1" style="text-align: left;"><p>Board of Management</p></td>')
  })

  it('keeps ordered list start and underline', () => {
    const html = roundTrip('<ol start="3"><li>Third</li></ol><p><u>Homework</u></p>')
    expect(html).toContain('<ol start="3">')
    expect(html).toContain('<u>Homework</u>')
  })

  it('keeps the text of div grids while dropping the grid', () => {
    expect(roundTrip('<div class="row"><div class="col"><p>Hosting Halloween Disco</p></div><div class="col"><p>End of Year Disco</p></div></div>'))
      .toBe('<p>Hosting Halloween Disco</p><p>End of Year Disco</p>')
  })
})
