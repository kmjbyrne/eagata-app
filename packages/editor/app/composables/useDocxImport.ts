import { finishDocxHtml } from '../utils/docxHtml'
import type { EditorUpload } from '../utils/editorUpload'

/**
 * Converts a Word document to HTML in the browser with mammoth. Each embedded
 * image goes through `upload`, one at a time so `progress` can report it.
 */
export function useDocxImport(upload: EditorUpload) {
  const progress = ref<{ done: number, total: number }>()

  async function importDocx(docx: File): Promise<string> {
    const { default: mammoth } = await import('mammoth')
    const base = docx.name.replace(/\.docx$/i, '')
    const images: { placeholder: string, file: File }[] = []

    const { value } = await mammoth.convertToHtml({ arrayBuffer: await docx.arrayBuffer() }, {
      convertImage: mammoth.images.imgElement(async (image) => {
        const placeholder = `docx-image-${images.length + 1}`
        const extension = image.contentType.split('/').pop()
        const file = new File([await image.readAsArrayBuffer()], `${base}-image-${images.length + 1}.${extension}`, { type: image.contentType })
        images.push({ placeholder, file })
        return { src: placeholder }
      })
    })

    const sources = new Map<string, string>()
    progress.value = { done: 0, total: images.length }
    try {
      for (const { placeholder, file } of images) {
        const { src } = await upload(file)
        sources.set(placeholder, src)
        progress.value = { done: sources.size, total: images.length }
      }
    } finally {
      progress.value = undefined
    }

    return finishDocxHtml(value, sources)
  }

  return { importDocx, progress }
}
