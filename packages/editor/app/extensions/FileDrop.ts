import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface FileDropOptions {
  onFiles: (files: File[], pos: number) => boolean
}

/** Hands pasted or dropped files to the component, which decides what to do. */
export const FileDrop = Extension.create<FileDropOptions>({
  name: 'fileDrop',

  addOptions() {
    return { onFiles: () => false }
  },

  addProseMirrorPlugins() {
    const { onFiles } = this.options
    return [new Plugin({
      key: new PluginKey('fileDrop'),
      props: {
        handlePaste(view, event) {
          const files = Array.from(event.clipboardData?.files ?? [])
          return files.length > 0 && onFiles(files, view.state.selection.from)
        },
        handleDrop(view, event) {
          const files = Array.from(event.dataTransfer?.files ?? [])
          if (!files.length) {
            return false
          }
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.from
          if (!onFiles(files, pos)) {
            return false
          }
          event.preventDefault()
          return true
        }
      }
    })]
  }
})
