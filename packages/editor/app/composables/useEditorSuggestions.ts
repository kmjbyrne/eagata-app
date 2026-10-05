import type { EditorCustomHandlers, EditorSuggestionMenuItem } from '@nuxt/ui'

export function useEditorSuggestions<T extends EditorCustomHandlers>(_handlers: T) {
  const items = [[{
    type: 'label',
    label: 'Style'
  }, {
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
    kind: 'bulletList',
    label: 'Bullet list',
    icon: 'i-lucide-list'
  }, {
    kind: 'orderedList',
    label: 'Numbered list',
    icon: 'i-lucide-list-ordered'
  }, {
    kind: 'blockquote',
    label: 'Quote',
    icon: 'i-lucide-text-quote'
  }, {
    kind: 'codeBlock',
    label: 'Code block',
    icon: 'i-lucide-square-code'
  }], [{
    type: 'label',
    label: 'Insert'
  }, {
    kind: 'imageUpload',
    label: 'Image',
    icon: 'i-lucide-image'
  }, {
    kind: 'table',
    label: 'Table',
    icon: 'i-lucide-table'
  }, {
    kind: 'horizontalRule',
    label: 'Horizontal rule',
    icon: 'i-lucide-separator-horizontal'
  }, {
    kind: 'docxImport',
    label: 'Import Word document',
    icon: 'i-vscode-icons-file-type-word'
  }]] satisfies EditorSuggestionMenuItem<T>[][]

  return { items }
}
