import { describe, expect, it } from 'vitest'
import { isEmbeddedImage, isGoogleDocsImage, needsCopying, pastedImageName } from './remoteImages'

describe('isGoogleDocsImage', () => {
  it.each([
    'https://lh7-rt.googleusercontent.com/docsz/AD_4nX?key=abc',
    'https://lh3.googleusercontent.com/abc'
  ])('matches %s', (src) => {
    expect(isGoogleDocsImage(src)).toBe(true)
  })

  it.each([
    'http://lh3.googleusercontent.com/abc',
    'https://googleusercontent.com.evil.example/abc',
    'https://s3.eu-west-1.amazonaws.com/bns.assets/a.jpg',
    '/media/a.jpg',
    'blob:http://localhost/1',
    'not a url',
    null
  ])('ignores %s', (src) => {
    expect(isGoogleDocsImage(src)).toBe(false)
  })
})

describe('pastedImageName', () => {
  it('numbers from one and uses the type\'s extension', () => {
    expect(pastedImageName(0, 'image/png')).toBe('pasted-image-1.png')
    expect(pastedImageName(2, 'application/octet-stream')).toBe('pasted-image-3.jpg')
  })
})

describe('needsCopying', () => {
  it('copies embedded and Google-hosted images', () => {
    expect(needsCopying('data:image/png;base64,iVBORw0KGgo=')).toBe(true)
    expect(needsCopying('https://lh7-rt.googleusercontent.com/docsz/a')).toBe(true)
  })

  it('leaves images already on the web alone', () => {
    expect(needsCopying('https://s3.eu-west-1.amazonaws.com/bns.assets/a.jpg')).toBe(false)
    expect(needsCopying('/media/a.jpg')).toBe(false)
    expect(isEmbeddedImage('data:text/html;base64,PGh0bWw+')).toBe(false)
  })
})
