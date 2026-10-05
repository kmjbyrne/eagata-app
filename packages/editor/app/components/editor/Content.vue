<script setup lang="ts">
import type { EditorCustomHandlers } from '@nuxt/ui'
import type { Editor } from '@tiptap/core'
import { CellSelection } from '@tiptap/pm/tables'
import { FileDrop } from '../../extensions/FileDrop'
import { ImageUpload } from '../../extensions/ImageUpload'
import { contentExtensions } from '../../extensions/schema'
import { cleanGoogleDocsHtml } from '../../utils/cleanGoogleDocsHtml'
import { cleanWordHtml } from '../../utils/cleanWordHtml'
import { isDocx } from '../../utils/docxHtml'
import { PasteWatch } from '../../extensions/PasteWatch'
import type { EditorFetchRemote, EditorUpload } from '../../utils/editorUpload'
import { isEmbeddedImage, needsCopying, pastedImageName } from '../../utils/remoteImages'

const props = withDefaults(defineProps<{
  upload: EditorUpload
  fetchRemote?: EditorFetchRemote
  placeholder?: string
  toolbarTo?: string
  /** A small box, such as a reply, rather than a document: less padding, and no block drag handle. */
  compact?: boolean
  /**
   * The fixed toolbar strip. Without it, formatting is still there: a bubble
   * toolbar over selected text, and commands after `/`.
   */
  toolbar?: boolean
}>(), {
  fetchRemote: undefined,
  placeholder: 'Write, or type \'/\' for commands...',
  toolbarTo: undefined,
  compact: false,
  toolbar: true
})

const html = defineModel<string>({ required: true })

defineSlots<{
  /** Sits between the toolbar and the body, e.g. a document title. */
  header?: (props: { focusBody: () => void }) => unknown
}>()

const slots = useSlots()

const toast = useToast()
const editorRef = useTemplateRef('editorRef')
const docxImport = useTemplateRef('docxImport')

function focusBody() {
  editorRef.value?.editor?.commands.focus('start')
}

const handlers = {
  imageUpload: {
    canExecute: (editor: Editor) => editor.can().insertImageUpload(),
    execute: (editor: Editor) => editor.chain().focus().insertImageUpload(),
    isActive: (editor: Editor) => editor.isActive('imageUpload')
  },
  docxImport: {
    canExecute: (editor: Editor) => editor.isEditable,
    execute: (editor: Editor) => {
      docxImport.value?.choose()
      return editor.chain()
    },
    isActive: () => false
  },
  table: {
    canExecute: (editor: Editor) => editor.can().insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
    execute: (editor: Editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
    isActive: (editor: Editor) => editor.isActive('table')
  },
  superscript: {
    canExecute: (editor: Editor) => editor.can().toggleSuperscript(),
    execute: (editor: Editor) => editor.chain().focus().toggleSuperscript(),
    isActive: (editor: Editor) => editor.isActive('superscript')
  },
  indent: {
    canExecute: (editor: Editor) => editor.can().sinkListItem('listItem'),
    execute: (editor: Editor) => editor.chain().focus().sinkListItem('listItem'),
    isActive: () => false
  },
  outdent: {
    canExecute: (editor: Editor) => editor.can().liftListItem('listItem'),
    execute: (editor: Editor) => editor.chain().focus().liftListItem('listItem'),
    isActive: () => false
  }
} satisfies EditorCustomHandlers

async function insertImages(images: File[], pos: number) {
  const editor = editorRef.value?.editor
  if (!editor) {
    return
  }
  for (const image of images) {
    try {
      const { src } = await props.upload(image)
      editor.chain().focus().insertContentAt(pos, { type: 'image', attrs: { src, alt: '' } }).run()
    } catch (e) {
      toast.add({ title: `Could not upload ${image.name}`, description: (e as Error).message, color: 'error' })
    }
  }
}

function onFiles(files: File[], pos: number) {
  const docx = files.find(isDocx)
  if (docx) {
    docxImport.value?.choose(docx)
    return true
  }
  const images = files.filter(file => file.type.startsWith('image/'))
  if (!images.length) {
    return false
  }
  insertImages(images, pos)
  return true
}

const editing = ref<{ pos: number, src: string }>()
const editingOpen = computed({
  get: () => !!editing.value,
  set: (value) => {
    if (!value) {
      editing.value = undefined
    }
  }
})

function replaceImage(src: string) {
  const editor = editorRef.value?.editor
  const pos = editing.value?.pos
  if (editor && pos !== undefined) {
    editor.chain().focus().setNodeSelection(pos).updateAttributes('image', { src }).run()
  }
}

const copying = new Set<string>()

async function downloadImage(src: string, index: number): Promise<File> {
  try {
    const response = await fetch(src)
    const blob = await response.blob()
    if (!response.ok || !blob.type.startsWith('image/')) {
      throw new Error(`Could not download ${src}`)
    }
    return new File([blob], pastedImageName(index, blob.type), { type: blob.type })
  } catch (e) {
    if (props.fetchRemote && !isEmbeddedImage(src)) {
      return props.fetchRemote(src)
    }
    throw e
  }
}

function replaceImageSrc(from: string, to: string) {
  const editor = editorRef.value?.editor
  if (!editor) {
    return
  }
  const { tr, doc } = editor.state
  doc.descendants((node, pos) => {
    if (node.type.name === 'image' && node.attrs.src === from) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: to })
    }
  })
  if (tr.docChanged) {
    editor.view.dispatch(tr)
  }
}

// Pasted images arrive embedded as base64 or hosted by Google Docs; copy them into the site's storage.
async function copyPastedImages(pasted: string[]) {
  const sources = new Set(pasted.filter(src => needsCopying(src) && !copying.has(src)))
  if (!sources.size) {
    return
  }
  const count = (n: number) => `${n} image${n === 1 ? '' : 's'}`
  const results = await Promise.allSettled([...sources].map(async (src, index) => {
    copying.add(src)
    try {
      const { src: stored } = await props.upload(await downloadImage(src, index))
      replaceImageSrc(src, stored)
    } finally {
      copying.delete(src)
    }
  }))
  const failed = results.filter(result => result.status === 'rejected').length
  if (failed) {
    toast.add({
      title: `Could not save ${count(failed)}`,
      description: 'Add them again from the file, or they may be lost.',
      color: 'warning',
      icon: 'i-lucide-image-off'
    })
  }
}

const extensions = [
  ...contentExtensions(),
  ImageUpload.configure({ upload: props.upload }),
  FileDrop.configure({ onFiles }),
  PasteWatch.configure({ onPastedImages: copyPastedImages })
]

const { toolbarItems, bubbleToolbarItems, getImageToolbarItems, getTableToolbarItems } = useEditorToolbar(handlers)
const { items: suggestionItems } = useEditorSuggestions(handlers)
const { getItems: getDragHandleItems, onNodeChange } = useEditorDragHandle(handlers)

type ShouldShow = { editor: Editor, view: { hasFocus: () => boolean }, state: Editor['state'] }

function showTextBubble({ editor, view, state }: ShouldShow) {
  if (editor.isActive('image') || editor.isActive('imageUpload') || state.selection instanceof CellSelection) {
    return false
  }
  return view.hasFocus() && !state.selection.empty
}

function showImageBubble({ editor, view }: ShouldShow) {
  return editor.isActive('image') && view.hasFocus()
}

function showTableBubble({ editor, view, state }: ShouldShow) {
  if (!view.hasFocus() || !editor.isActive('table')) {
    return false
  }
  return state.selection instanceof CellSelection || state.selection.empty
}
</script>

<template>
  <UEditor
    ref="editorRef"
    v-slot="{ editor, handlers: allHandlers }"
    v-model="html"
    content-type="html"
    :extensions="extensions"
    :handlers="handlers"
    :starter-kit="{ link: { HTMLAttributes: { target: null, rel: null } } }"
    :image="false"
    :placeholder="placeholder"
    :editor-props="{ transformPastedHTML: (pasted: string) => cleanGoogleDocsHtml(cleanWordHtml(pasted)) }"
    class="flex flex-col"
    :ui="{
      base: [
        compact
          ? 'min-h-24 px-4 py-3'
          : slots.header ? 'min-h-96 px-4 pt-2 pb-4 sm:px-14 sm:pb-14' : 'min-h-96 p-4 sm:p-14',
        '[&_table]:w-full [&_table]:border-collapse',
        '[&_td]:border [&_td]:border-default [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-default [&_th]:bg-elevated [&_th]:px-3 [&_th]:py-2 [&_th]:text-left',
        '[&_td_p]:my-0 [&_th_p]:my-0 [&_.selectedCell]:bg-primary/10',
        '[&_img]:max-h-96 [&_img]:rounded-sm'
      ],
      content: 'mx-auto w-full max-w-4xl'
    }"
  >
    <Teleport
      v-if="toolbar"
      :to="toolbarTo"
      :disabled="!toolbarTo"
      defer
    >
      <div
        class="overflow-x-auto"
        :class="toolbarTo ? 'w-max' : 'sticky top-0 z-10 border-b border-default bg-default/95 px-2 py-1 backdrop-blur'"
      >
        <UEditorToolbar
          :editor="editor"
          :items="toolbarItems"
        >
          <template #link>
            <EditorLinkPopover :editor="editor" />
          </template>
          <template #color>
            <EditorColorPopover :editor="editor" />
          </template>
        </UEditorToolbar>
      </div>
    </Teleport>

    <div
      v-if="$slots.header"
      class="mx-auto w-full max-w-4xl px-4 pt-8 sm:px-14"
    >
      <slot
        name="header"
        :focus-body="focusBody"
      />
    </div>

    <EditorImageEditor
      v-if="editing"
      v-model:open="editingOpen"
      :src="editing.src"
      :upload="upload"
      @saved="replaceImage"
    />

    <EditorDocxImport
      ref="docxImport"
      :editor="editor"
      :upload="upload"
    />

    <UEditorToolbar
      :editor="editor"
      :items="bubbleToolbarItems"
      layout="bubble"
      :should-show="showTextBubble"
    >
      <template #link>
        <EditorLinkPopover :editor="editor" />
      </template>
      <template #color>
        <EditorColorPopover :editor="editor" />
      </template>
    </UEditorToolbar>

    <UEditorToolbar
      :editor="editor"
      :items="getImageToolbarItems(editor, (pos, src) => editing = { pos, src })"
      layout="bubble"
      :should-show="showImageBubble"
    />

    <UEditorToolbar
      :editor="editor"
      :items="getTableToolbarItems(editor)"
      layout="bubble"
      :should-show="showTableBubble"
    />

    <UEditorSuggestionMenu
      :editor="editor"
      :items="suggestionItems"
    />

    <!-- Compact boxes, such as replies, have no gutter for it: blocks there
         are formatted from the bubble toolbar and / commands. -->
    <UEditorDragHandle
      v-if="!compact"
      v-slot="{ ui, onClick }"
      :editor="editor"
      @node-change="onNodeChange"
    >
      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Insert block"
        :class="ui.handle?.()"
        @click="(event: MouseEvent) => {
          event.stopPropagation()
          const node = onClick()
          allHandlers.suggestion?.execute(editor, { pos: node?.pos }).run()
        }"
      />

      <UDropdownMenu
        v-slot="{ open }"
        :modal="false"
        :items="getDragHandleItems(editor)"
        :content="{ side: 'left' }"
        :ui="{ content: 'w-48', label: 'text-xs' }"
        @update:open="editor.chain().setMeta('lockDragHandle', $event).run()"
      >
        <UButton
          color="neutral"
          variant="ghost"
          active-variant="soft"
          size="sm"
          icon="i-lucide-grip-vertical"
          aria-label="Block actions"
          :active="open"
          :class="ui.handle?.()"
        />
      </UDropdownMenu>
    </UEditorDragHandle>

    <div
      v-if="!compact"
      class="order-last mx-auto flex w-full max-w-4xl justify-end px-4 pb-6 text-xs text-dimmed sm:px-14"
    >
      {{ editor.storage.characterCount.words() }} words
    </div>
  </UEditor>
</template>
