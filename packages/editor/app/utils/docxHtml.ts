export const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export function isDocx(file: File): boolean {
  return file.type === DOCX_TYPE || file.name.toLowerCase().endsWith('.docx')
}

/**
 * Finishes the HTML mammoth made from a Word document: swaps each image
 * placeholder for its uploaded URL, gives images the full-width landscape
 * style that Word imports have always used, and lifts images out of their
 * paragraphs so the block image node leaves no empty paragraph behind.
 */
export function finishDocxHtml(html: string, sources: Map<string, string>): string {
  return html.replace(/<p>((?:\s*<img\b[^>]*>)+)\s*<\/p>/gi, '$1').replace(/<img\b[^>]*>/gi, (tag) => {
    const placeholder = /\ssrc="([^"]*)"/i.exec(tag)?.[1] ?? ''
    const src = sources.get(placeholder) ?? placeholder
    const rest = tag.replace(/^<img\b/i, '').replace(/\s(?:src|class)="[^"]*"/gi, '').replace(/\s*\/?>$/, '')
    return `<img src="${src}" class="article-image-override"${rest}>`
  })
}
