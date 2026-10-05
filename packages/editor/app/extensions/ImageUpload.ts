import { Node, mergeAttributes } from '@tiptap/core'
import type { Range } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ImageUploadNode from '../components/editor/ImageUploadNode.vue'
import type { EditorUpload } from '../utils/editorUpload'

export interface ImageUploadOptions {
  upload?: EditorUpload
}

export interface ImageUploadStorage {
  /** Set by an insert so only that placeholder opens the file picker. Undo and drag mount it again without one. */
  openPicker: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageUpload: {
      insertImageUpload: (range?: Range) => ReturnType
    }
  }

  interface Storage {
    imageUpload: ImageUploadStorage
  }
}

/** A placeholder block that turns into an image once the host stores the file. */
export const ImageUpload = Node.create<ImageUploadOptions>({
  name: 'imageUpload',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return { upload: undefined }
  },

  addStorage() {
    return { openPicker: false }
  },

  addCommands() {
    return {
      insertImageUpload: range => ({ commands, dispatch }) => {
        const content = { type: this.name }
        const inserted = range ? commands.insertContentAt(range, content) : commands.insertContent(content)
        if (inserted && dispatch) {
          this.storage.openPicker = true
        }
        return inserted
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="image-upload"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'image-upload' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(ImageUploadNode)
  }
})
