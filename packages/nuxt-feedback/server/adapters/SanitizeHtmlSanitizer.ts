import type { HtmlSanitizer } from '@kmjbyrne/core/feedback'
import sanitizeHtml from 'sanitize-html'

/** Images are the app's own uploads, so a reader's browser never calls out to another host. */
const SITE_PATH = /^\/(?![/\\])[^\\\s]*$/

const COLOR = [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i, /^var\(--[\w-]+\)$/]

/** What the editor can make, minus embeds: no iframes, video or scripts. */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'h1', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'sup', 'span', 'mark',
    'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'colgroup', 'col'
  ],
  allowedAttributes: {
    'a': ['href', 'target', 'rel'],
    'img': ['src', 'alt', 'width', 'height'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan'],
    '*': ['style']
  },
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify)$/],
      'color': COLOR,
      'background-color': COLOR
    }
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: [] },
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    img: (tagName, attribs) => {
      const { src, ...rest } = attribs
      return { tagName, attribs: src && SITE_PATH.test(src) ? attribs : rest }
    }
  }
}

export class SanitizeHtmlSanitizer implements HtmlSanitizer {
  sanitize(html: string): string {
    return sanitizeHtml(html, OPTIONS)
  }
}
