import { describe, expect, it } from 'vitest'
import { editableImageSrc, editedImageFile } from './imageExport'

describe('editedImageFile', () => {
  it('keeps a JPEG as JPEG with an -edited name', () => {
    expect(editedImageFile('https://cdn.example/images/2026/06/football.JPG?v=3')).toEqual({
      name: 'football-edited.jpg',
      type: 'image/jpeg',
      quality: 0.85
    })
  })

  it('keeps PNG lossless', () => {
    expect(editedImageFile('/media/1/2026/09/logo.png')).toMatchObject({ name: 'logo-edited.png', type: 'image/png', quality: undefined })
  })

  it('saves a GIF as PNG, since canvas cannot write GIF', () => {
    expect(editedImageFile('/media/wave.gif')).toMatchObject({ name: 'wave-edited.png', type: 'image/png' })
  })

  it('falls back to JPEG for unknown or missing extensions', () => {
    expect(editedImageFile('/media/photo')).toMatchObject({ name: 'photo-edited.jpg', type: 'image/jpeg' })
  })

  it('prefers the fetched content type over the extension', () => {
    expect(editedImageFile('/media/photo', 'image/webp')).toMatchObject({ name: 'photo-edited.webp', type: 'image/webp' })
  })

  it('names blob URLs generically', () => {
    expect(editedImageFile('blob:http://localhost:3000/5f1c', 'image/png')).toMatchObject({ name: 'image-edited.png' })
  })

  it('does not stack -edited suffixes on re-edits', () => {
    expect(editedImageFile('/media/football-edited.jpg').name).toBe('football-edited.jpg')
  })
})

describe('editableImageSrc', () => {
  const origin = 'https://school.example'

  it('adds a cache-busting parameter to cross-origin images', () => {
    expect(editableImageSrc('https://cdn.example/a.jpg?v=2', origin, 'n1')).toBe('https://cdn.example/a.jpg?v=2&edit=n1')
  })

  it('leaves same-origin, relative, blob and data URLs alone', () => {
    expect(editableImageSrc('https://school.example/media/a.jpg', origin, 'n1')).toBe('https://school.example/media/a.jpg')
    expect(editableImageSrc('/media/a.jpg', origin, 'n1')).toBe('/media/a.jpg')
    expect(editableImageSrc('blob:https://school.example/5f1c', origin, 'n1')).toBe('blob:https://school.example/5f1c')
    expect(editableImageSrc('data:image/png;base64,AAA', origin, 'n1')).toBe('data:image/png;base64,AAA')
  })
})
