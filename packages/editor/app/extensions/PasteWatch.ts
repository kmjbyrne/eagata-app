import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface PasteWatchOptions {
  /** Called once a paste has landed, with the image sources it brought in. */
  onPastedImages: (sources: string[]) => void
}

/** Reports the images each paste brings in, so the component can copy them into storage. */
export const PasteWatch = Extension.create<PasteWatchOptions>({
  name: 'pasteWatch',

  addOptions() {
    return { onPastedImages: () => {} }
  },

  addProseMirrorPlugins() {
    const { onPastedImages } = this.options
    return [new Plugin({
      key: new PluginKey('pasteWatch'),
      props: {
        transformPasted(slice) {
          const sources: string[] = []
          slice.content.descendants((node) => {
            if (node.type.name === 'image' && typeof node.attrs.src === 'string') {
              sources.push(node.attrs.src)
            }
          })
          if (sources.length) {
            setTimeout(() => onPastedImages(sources))
          }
          return slice
        }
      }
    })]
  }
})
