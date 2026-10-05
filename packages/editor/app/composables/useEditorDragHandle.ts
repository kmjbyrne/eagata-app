import type { DropdownMenuItem, EditorCustomHandlers } from '@nuxt/ui'
import type { Editor, JSONContent } from '@tiptap/vue-3'
import { mapEditorItems } from '#ui/utils/editor'

const CONVERTIBLE_TYPES = ['paragraph', 'heading', 'bulletList', 'orderedList', 'blockquote', 'codeBlock', 'listItem']

const LABELS: Record<string, string> = {
  bulletList: 'Bullet list',
  orderedList: 'Numbered list',
  codeBlock: 'Code block',
  horizontalRule: 'Horizontal rule',
  listItem: 'List item',
  imageUpload: 'Image upload'
}

function label(type: string) {
  return LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1)
}

export function useEditorDragHandle<T extends EditorCustomHandlers>(handlers: T) {
  const selected = ref<{ node: JSONContent | null, pos: number }>()

  function typeItems(editor: Editor, type: string, pos: number | undefined): DropdownMenuItem[] {
    if (CONVERTIBLE_TYPES.includes(type)) {
      return [{
        label: 'Turn into',
        icon: 'i-lucide-repeat-2',
        children: [
          { kind: 'paragraph', label: 'Paragraph', icon: 'i-lucide-pilcrow' },
          { kind: 'heading', level: 1, label: 'Heading 1', icon: 'i-lucide-heading-1' },
          { kind: 'heading', level: 2, label: 'Heading 2', icon: 'i-lucide-heading-2' },
          { kind: 'heading', level: 3, label: 'Heading 3', icon: 'i-lucide-heading-3' },
          { kind: 'heading', level: 4, label: 'Heading 4', icon: 'i-lucide-heading-4' },
          { kind: 'bulletList', label: 'Bullet list', icon: 'i-lucide-list' },
          { kind: 'orderedList', label: 'Numbered list', icon: 'i-lucide-list-ordered' },
          { kind: 'blockquote', label: 'Quote', icon: 'i-lucide-text-quote' },
          { kind: 'codeBlock', label: 'Code block', icon: 'i-lucide-square-code' }
        ]
      }, {
        kind: 'clearFormatting',
        pos,
        label: 'Reset formatting',
        icon: 'i-lucide-rotate-ccw'
      }]
    }

    if (type === 'image') {
      const node = pos === undefined ? null : editor.state.doc.nodeAt(pos)
      return [{
        label: 'Download image',
        icon: 'i-lucide-download',
        to: node?.attrs?.src,
        download: true
      }]
    }

    return []
  }

  function getItems(editor: Editor): DropdownMenuItem[][] {
    const type = selected.value?.node?.type
    if (!type) {
      return []
    }
    const pos = selected.value?.pos

    return mapEditorItems(editor, [[
      { type: 'label', label: label(type) },
      ...typeItems(editor, type, pos)
    ], [
      { kind: 'duplicate', pos, label: 'Duplicate', icon: 'i-lucide-copy' }
    ], [
      { kind: 'moveUp', pos, label: 'Move up', icon: 'i-lucide-arrow-up' },
      { kind: 'moveDown', pos, label: 'Move down', icon: 'i-lucide-arrow-down' }
    ], [
      { kind: 'delete', pos, label: 'Delete', icon: 'i-lucide-trash' }
    ]], handlers) as DropdownMenuItem[][]
  }

  function onNodeChange(event: { node: JSONContent | null, pos: number }) {
    selected.value = event
  }

  return { getItems, onNodeChange }
}
