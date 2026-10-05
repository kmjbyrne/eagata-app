import { Node, mergeAttributes } from '@tiptap/core'
import Image from '@tiptap/extension-image'

export const IMAGE_VARIANTS = {
  'override': 'Landscape (full width)',
  'custom-override': 'Custom size',
  'sm': 'Small (logos, badges)',
  'portrait': 'Side-by-side portrait',
  'portrait-fw': 'Full-width portrait',
  'rotate-90-right': 'Rotate 90° clockwise',
  'rotate-90-left': 'Rotate 90° anti-clockwise',
  'rotate-180': 'Rotate 180°'
} as const

export type ImageVariant = keyof typeof IMAGE_VARIANTS

const VARIANT_PREFIX = 'article-image-'

function keep(name: string) {
  return {
    default: null,
    parseHTML: (element: HTMLElement) => element.getAttribute(name),
    renderHTML: (attributes: Record<string, unknown>) => attributes[name] == null ? {} : { [name]: attributes[name] }
  }
}

/**
 * The image node, plus the TinyMCE image classes as a `variant` attribute
 * (`article-image-<variant>`) and the inline style legacy bodies use for size,
 * centring and borders. Base64 sources stay allowed because one legacy body
 * embeds an image that way.
 */
export const LegacyImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      variant: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const name = Array.from(element.classList).find(name => name.startsWith(VARIANT_PREFIX))
          const variant = name?.slice(VARIANT_PREFIX.length)
          return variant && variant in IMAGE_VARIANTS ? variant : null
        },
        renderHTML: (attributes: Record<string, unknown>) => attributes.variant ? { class: `${VARIANT_PREFIX}${attributes.variant}` } : {}
      },
      style: keep('style')
    }
  },

  parseHTML() {
    return [
      // TinyMCE wrapped images in paragraphs. Parsing the block image inside
      // one leaves an empty paragraph behind, so skip a paragraph that holds
      // only images and parse its images directly.
      {
        tag: 'p',
        priority: 60,
        skip: true,
        getAttrs: element => element.children.length > 0
          && Array.from(element.children).every(child => child.tagName === 'IMG')
          && !element.textContent?.trim()
          ? null
          : false
      },
      ...(this.parent?.() ?? [])
    ]
  }
}).configure({ allowBase64: true })

/** `<figure class="image">` holding an image and an optional caption. */
export const Figure = Node.create({
  name: 'figure',
  group: 'block',
  content: 'image figcaption?',
  draggable: true,
  isolating: true,

  addAttributes() {
    return { class: keep('class') }
  },

  parseHTML() {
    return [{ tag: 'figure' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', HTMLAttributes, 0]
  }
})

export const Figcaption = Node.create({
  name: 'figcaption',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'figcaption' }]
  },

  renderHTML() {
    return ['figcaption', 0]
  }
})

/** `<video>` with one `<source>`, as TinyMCE's media plugin wrote it. */
export const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: element => element.getAttribute('src') ?? element.querySelector('source')?.getAttribute('src') ?? null,
        renderHTML: () => ({})
      },
      type: {
        default: null,
        parseHTML: element => element.querySelector('source')?.getAttribute('type') ?? null,
        renderHTML: () => ({})
      },
      class: keep('class'),
      width: keep('width'),
      height: keep('height')
    }
  },

  parseHTML() {
    return [{ tag: 'video' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const source = mergeAttributes({ src: node.attrs.src }, node.attrs.type ? { type: node.attrs.type } : {})
    return ['video', mergeAttributes(HTMLAttributes, { controls: '' }), ['source', source]]
  }
})

/** Embedded players (YouTube, Google Drive previews). */
export const Iframe = Node.create({
  name: 'iframe',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: keep('src'),
      width: keep('width'),
      height: keep('height'),
      title: keep('title'),
      frameborder: keep('frameborder'),
      allowfullscreen: keep('allowfullscreen')
    }
  },

  parseHTML() {
    return [{ tag: 'iframe[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['iframe', HTMLAttributes]
  }
})
