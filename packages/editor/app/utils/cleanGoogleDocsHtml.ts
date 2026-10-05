const GOOGLE_DOCS_MARKER = /id="docs-internal-guid-/

const DROPPED_ATTRIBUTES = ['style', 'dir', 'role', 'aria-level', 'id', 'align', 'width']

function declarations(element: Element): Map<string, string> {
  const map = new Map<string, string>()
  for (const declaration of (element.getAttribute('style') ?? '').split(';')) {
    const colon = declaration.indexOf(':')
    if (colon > 0) {
      map.set(declaration.slice(0, colon).trim().toLowerCase(), declaration.slice(colon + 1).trim().toLowerCase())
    }
  }
  return map
}

function isBold(weight: string | undefined): boolean {
  return weight === 'bold' || weight === 'bolder' || Number(weight) >= 600
}

function isDefaultColour(colour: string | undefined, inLink: boolean): boolean {
  if (!colour) {
    return true
  }
  const plain = colour.replace(/\s/g, '')
  return ['#000000', '#000', 'rgb(0,0,0)', 'black', 'inherit'].includes(plain) || (inLink && ['#1155cc', 'rgb(17,85,204)'].includes(plain))
}

function isVisibleBackground(background: string | undefined): boolean {
  if (!background) {
    return false
  }
  const plain = background.replace(/\s/g, '')
  return !['transparent', '#ffffff', '#fff', 'white', 'rgb(255,255,255)', 'rgba(0,0,0,0)', 'inherit'].includes(plain)
}

/** Replaces a Google Docs span with real formatting tags, keeping only colours that mean something. */
function convertSpan(span: HTMLElement) {
  const doc = span.ownerDocument
  const style = declarations(span)
  const inLink = !!span.closest('a')
  const decoration = style.get('text-decoration') ?? style.get('text-decoration-line') ?? ''
  const tags = [
    isBold(style.get('font-weight')) && 'strong',
    style.get('font-style') === 'italic' && 'em',
    decoration.includes('underline') && !inLink && 'u',
    decoration.includes('line-through') && 's',
    style.get('vertical-align') === 'super' && 'sup',
    style.get('vertical-align') === 'sub' && 'sub'
  ].filter((tag): tag is string => !!tag)

  const kept: string[] = []
  const colour = style.get('color')
  if (!isDefaultColour(colour, inLink)) {
    kept.push(`color: ${colour}`)
  }
  const background = style.get('background-color')
  if (isVisibleBackground(background)) {
    kept.push(`background-color: ${background}`)
  }

  let content: Node = doc.createDocumentFragment()
  while (span.firstChild) {
    content.appendChild(span.firstChild)
  }
  for (const tag of tags.reverse()) {
    const wrapper = doc.createElement(tag)
    wrapper.appendChild(content)
    content = wrapper
  }
  if (kept.length) {
    const wrapper = doc.createElement('span')
    wrapper.setAttribute('style', kept.join('; '))
    wrapper.appendChild(content)
    content = wrapper
  }
  span.replaceWith(content)
}

function unwrap(element: Element) {
  element.replaceWith(...Array.from(element.childNodes))
}

/** A nested list Google puts directly inside its parent list belongs in the item before it. */
function nestStrayLists(body: HTMLElement) {
  body.querySelectorAll('ul > ul, ul > ol, ol > ul, ol > ol').forEach((nested) => {
    const previous = nested.previousElementSibling
    if (previous?.tagName === 'LI') {
      previous.appendChild(nested)
    }
  })
}

/**
 * Google splits one list into several whenever items differ in paragraph
 * settings; each would render as its own block with extra space around it.
 */
function mergeAdjacentLists(body: HTMLElement) {
  body.querySelectorAll('ul, ol').forEach((list) => {
    if (!list.isConnected) {
      return
    }
    let next = list.nextSibling
    while (next) {
      if (next.nodeType === 3 && !next.textContent?.trim()) {
        next = next.nextSibling
        continue
      }
      if (next.nodeType !== 1 || (next as Element).tagName !== list.tagName) {
        break
      }
      const following = next.nextSibling
      list.append(...Array.from(next.childNodes))
      next.parentNode?.removeChild(next)
      next = following
    }
  })
}

/** Google routes pasted links through google.com/url?q=<target>. */
export function unwrapGoogleRedirect(href: string): string {
  try {
    const url = new URL(href)
    if (/(^|\.)google\.[a-z.]+$/.test(url.hostname) && url.pathname === '/url') {
      return url.searchParams.get('q') ?? href
    }
  } catch {
    return href
  }
  return href
}

/**
 * Cleans HTML pasted from Google Docs: turns its style-only formatting into
 * tags, keeps colours that differ from the default, drops every other inline
 * style, unwraps Google's redirect links, rejoins lists Google split and nests
 * stray sublists, and removes the line breaks and fixed widths it adds between
 * blocks. Other HTML passes through.
 */
export function cleanGoogleDocsHtml(html: string): string {
  if (!GOOGLE_DOCS_MARKER.test(html)) {
    return html
  }
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const body = doc.body

  body.querySelectorAll('meta, colgroup').forEach(element => element.remove())
  body.querySelectorAll('b[id^="docs-internal-guid-"]').forEach(unwrap)
  body.querySelectorAll('span').forEach(span => convertSpan(span as HTMLElement))
  Array.from(body.children).filter(element => element.tagName === 'BR').forEach(element => element.remove())
  body.querySelectorAll('div').forEach((div) => {
    if (div.querySelector('table')) {
      unwrap(div)
    }
  })
  nestStrayLists(body)
  mergeAdjacentLists(body)
  body.querySelectorAll('a[href]').forEach((link) => {
    link.setAttribute('href', unwrapGoogleRedirect(link.getAttribute('href') ?? ''))
  })
  body.querySelectorAll(':not(span)').forEach((element) => {
    const align = declarations(element).get('text-align')
    for (const name of DROPPED_ATTRIBUTES) {
      if (name === 'width' && element.tagName === 'IMG') {
        continue
      }
      element.removeAttribute(name)
    }
    if (align && align !== 'left' && align !== 'start' && /^(P|H[1-6])$/.test(element.tagName)) {
      element.setAttribute('style', `text-align: ${align}`)
    }
  })

  return body.innerHTML
}
