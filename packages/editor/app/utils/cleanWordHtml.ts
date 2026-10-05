const WORD_MARKERS = /urn:schemas-microsoft-com|class="?Mso|mso-|<o:p>/i

function cleanStyle(style: string): string {
  return style.split(';')
    .map(declaration => declaration.trim())
    .filter(declaration => declaration && !/^mso-/i.test(declaration))
    .join('; ')
}

/**
 * Strips the markup MS Word adds to pasted HTML: conditional comments, XML
 * islands, `o:p` and other namespaced tags, `Mso*` classes, `mso-*` style
 * declarations and the empty spans left behind. Other HTML passes through.
 */
export function cleanWordHtml(html: string): string {
  if (!WORD_MARKERS.test(html)) {
    return html
  }

  let cleaned = html
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(xml|style|title)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(?:meta|link)\b[^>]*>/gi, '')
    .replace(/<o:p>\s*<\/o:p>/gi, '')
    .replace(/<\/?[a-z][a-z0-9]*:[a-z0-9]+\b[^>]*>/gi, '')
    .replace(/\s(?:lang|xml:lang)="[^"]*"/gi, '')
    .replace(/\sclass="([^"]*)"/gi, (_, names: string) => {
      const kept = names.split(/\s+/).filter(name => name && !/^Mso/i.test(name))
      return kept.length ? ` class="${kept.join(' ')}"` : ''
    })
    .replace(/\sstyle="([^"]*)"/gi, (_, style: string) => {
      const kept = cleanStyle(style)
      return kept ? ` style="${kept}"` : ''
    })

  let previous
  do {
    previous = cleaned
    cleaned = cleaned.replace(/<span>([\s\S]*?)<\/span>/gi, '$1')
  } while (cleaned !== previous)

  return cleaned
}
