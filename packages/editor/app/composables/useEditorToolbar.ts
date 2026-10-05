import type { EditorCustomHandlers, EditorToolbarItem } from '@nuxt/ui'
import type { Editor } from '@tiptap/vue-3'
import { IMAGE_VARIANTS } from '../extensions/legacy'

const EDITOR_BLOCK_TYPES = [{
  kind: 'paragraph',
  label: 'Paragraph',
  icon: 'i-lucide-pilcrow'
}, {
  kind: 'heading',
  level: 1,
  label: 'Heading 1',
  icon: 'i-lucide-heading-1'
}, {
  kind: 'heading',
  level: 2,
  label: 'Heading 2',
  icon: 'i-lucide-heading-2'
}, {
  kind: 'heading',
  level: 3,
  label: 'Heading 3',
  icon: 'i-lucide-heading-3'
}, {
  kind: 'heading',
  level: 4,
  label: 'Heading 4',
  icon: 'i-lucide-heading-4'
}] as const

function tip(text: string) {
  return { 'tooltip': { text }, 'aria-label': text }
}

export function useEditorToolbar<T extends EditorCustomHandlers>(_handlers: T) {
  const marks = [{
    kind: 'mark',
    mark: 'bold',
    icon: 'i-lucide-bold',
    ...tip('Bold')
  }, {
    kind: 'mark',
    mark: 'italic',
    icon: 'i-lucide-italic',
    ...tip('Italic')
  }, {
    kind: 'mark',
    mark: 'underline',
    icon: 'i-lucide-underline',
    ...tip('Underline')
  }, {
    kind: 'mark',
    mark: 'strike',
    icon: 'i-lucide-strikethrough',
    ...tip('Strikethrough')
  }, {
    kind: 'superscript',
    icon: 'i-lucide-superscript',
    ...tip('Superscript')
  }] satisfies EditorToolbarItem<T>[]

  const blockType = {
    label: 'Format',
    trailingIcon: 'i-lucide-chevron-down',
    activeColor: 'neutral',
    activeVariant: 'ghost',
    ...tip('Text format'),
    content: { align: 'start' },
    ui: { label: 'text-xs' },
    items: [...EDITOR_BLOCK_TYPES]
  } satisfies EditorToolbarItem<T>

  const toolbarItems: EditorToolbarItem<T>[][] = [[{
    kind: 'undo',
    icon: 'i-lucide-undo',
    ...tip('Undo')
  }, {
    kind: 'redo',
    icon: 'i-lucide-redo',
    ...tip('Redo')
  }], [blockType], marks, [{
    slot: 'color',
    icon: 'i-lucide-palette'
  }], [{
    icon: 'i-lucide-align-left',
    ...tip('Align'),
    content: { align: 'start' },
    items: [{
      kind: 'textAlign',
      align: 'left',
      label: 'Left',
      icon: 'i-lucide-align-left'
    }, {
      kind: 'textAlign',
      align: 'center',
      label: 'Center',
      icon: 'i-lucide-align-center'
    }, {
      kind: 'textAlign',
      align: 'right',
      label: 'Right',
      icon: 'i-lucide-align-right'
    }, {
      kind: 'textAlign',
      align: 'justify',
      label: 'Justify',
      icon: 'i-lucide-align-justify'
    }]
  }], [{
    kind: 'bulletList',
    icon: 'i-lucide-list',
    ...tip('Bullet list')
  }, {
    kind: 'orderedList',
    icon: 'i-lucide-list-ordered',
    ...tip('Numbered list')
  }, {
    kind: 'outdent',
    icon: 'i-lucide-indent-decrease',
    ...tip('Decrease indent')
  }, {
    kind: 'indent',
    icon: 'i-lucide-indent-increase',
    ...tip('Increase indent')
  }], [{
    kind: 'blockquote',
    icon: 'i-lucide-text-quote',
    ...tip('Quote')
  }, {
    kind: 'horizontalRule',
    icon: 'i-lucide-separator-horizontal',
    ...tip('Horizontal rule')
  }], [{
    slot: 'link',
    icon: 'i-lucide-link'
  }, {
    kind: 'imageUpload',
    icon: 'i-lucide-image',
    ...tip('Insert image')
  }, {
    kind: 'table',
    icon: 'i-lucide-table',
    ...tip('Insert table')
  }, {
    kind: 'docxImport',
    icon: 'i-vscode-icons-file-type-word',
    ...tip('Import Word document')
  }], [{
    kind: 'clearFormatting',
    icon: 'i-lucide-remove-formatting',
    ...tip('Clear formatting')
  }]]

  const bubbleToolbarItems: EditorToolbarItem<T>[][] = [[{
    ...blockType,
    label: 'Turn into',
    ...tip('Turn into'),
    items: [
      ...EDITOR_BLOCK_TYPES,
      { kind: 'bulletList', label: 'Bullet list', icon: 'i-lucide-list' },
      { kind: 'orderedList', label: 'Numbered list', icon: 'i-lucide-list-ordered' },
      { kind: 'blockquote', label: 'Quote', icon: 'i-lucide-text-quote' },
      { kind: 'codeBlock', label: 'Code block', icon: 'i-lucide-square-code' }
    ]
  }], marks, [{
    slot: 'color',
    icon: 'i-lucide-palette'
  }, {
    slot: 'link',
    icon: 'i-lucide-link'
  }]]

  function getImageToolbarItems(editor: Editor, onEdit: (pos: number, src: string) => void): EditorToolbarItem<T>[][] {
    const { from } = editor.state.selection
    const node = editor.state.doc.nodeAt(from)

    return [[{
      label: 'Style',
      trailingIcon: 'i-lucide-chevron-down',
      ...tip('Image style'),
      content: { align: 'start' },
      items: [{ label: 'Default', onSelect: () => editor.chain().focus().updateAttributes('image', { variant: null }).run() },
        ...Object.entries(IMAGE_VARIANTS).map(([variant, label]) => ({
          label,
          type: 'checkbox' as const,
          checked: node?.attrs.variant === variant,
          onSelect: () => editor.chain().focus().updateAttributes('image', { variant }).run()
        }))]
    }], [{
      icon: 'i-lucide-crop',
      ...tip('Edit image'),
      onClick: () => {
        if (node?.type.name === 'image' && node.attrs.src) {
          onEdit(from, node.attrs.src)
        }
      }
    }, {
      icon: 'i-lucide-download',
      to: node?.attrs?.src,
      download: true,
      ...tip('Download')
    }, {
      icon: 'i-lucide-refresh-cw',
      ...tip('Replace'),
      onClick: () => {
        if (node?.type.name === 'image') {
          editor.chain().focus().insertImageUpload({ from, to: from + node.nodeSize }).run()
        }
      }
    }, {
      icon: 'i-lucide-trash',
      ...tip('Delete'),
      onClick: () => {
        if (node?.type.name === 'image') {
          editor.chain().focus().deleteRange({ from, to: from + node.nodeSize }).run()
        }
      }
    }]]
  }

  function getTableToolbarItems(editor: Editor): EditorToolbarItem<T>[][] {
    return [[{
      icon: 'i-lucide-between-vertical-start',
      ...tip('Add row above'),
      onClick: () => editor.chain().focus().addRowBefore().run()
    }, {
      icon: 'i-lucide-between-vertical-end',
      ...tip('Add row below'),
      onClick: () => editor.chain().focus().addRowAfter().run()
    }, {
      icon: 'i-lucide-between-horizontal-start',
      ...tip('Add column before'),
      onClick: () => editor.chain().focus().addColumnBefore().run()
    }, {
      icon: 'i-lucide-between-horizontal-end',
      ...tip('Add column after'),
      onClick: () => editor.chain().focus().addColumnAfter().run()
    }], [{
      icon: 'i-lucide-table-cells-merge',
      ...tip('Merge or split cells'),
      onClick: () => editor.chain().focus().mergeOrSplit().run()
    }, {
      icon: 'i-lucide-heading',
      ...tip('Toggle header row'),
      onClick: () => editor.chain().focus().toggleHeaderRow().run()
    }], [{
      icon: 'i-lucide-rows-3',
      ...tip('Delete row'),
      onClick: () => editor.chain().focus().deleteRow().run()
    }, {
      icon: 'i-lucide-columns-3',
      ...tip('Delete column'),
      onClick: () => editor.chain().focus().deleteColumn().run()
    }, {
      icon: 'i-lucide-trash',
      ...tip('Delete table'),
      onClick: () => editor.chain().focus().deleteTable().run()
    }]]
  }

  return {
    toolbarItems,
    bubbleToolbarItems,
    getImageToolbarItems,
    getTableToolbarItems
  }
}
