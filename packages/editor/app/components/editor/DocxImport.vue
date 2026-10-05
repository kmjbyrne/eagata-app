<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import type { EditorUpload } from '../../utils/editorUpload'

const props = defineProps<{
  editor: Editor
  upload: EditorUpload
}>()

const { importDocx, progress } = useDocxImport(props.upload)

const input = useTemplateRef('input')
const open = ref(false)
const file = ref<File>()
const busy = ref(false)
const error = ref<string>()

function choose(docx?: File) {
  if (!docx) {
    input.value?.click()
    return
  }
  file.value = docx
  error.value = undefined
  open.value = true
}

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  choose(target.files?.[0])
  target.value = ''
}

async function run(mode: 'replace' | 'insert') {
  if (!file.value) {
    return
  }
  busy.value = true
  error.value = undefined
  try {
    const html = await importDocx(file.value)
    if (mode === 'replace') {
      props.editor.chain().focus().setContent(html).run()
    } else {
      props.editor.chain().focus().insertContent(html).run()
    }
    open.value = false
  } catch (e) {
    error.value = `The import failed: ${(e as Error).message || 'unknown error'}`
  } finally {
    busy.value = false
  }
}

defineExpose({ choose })
</script>

<template>
  <input
    ref="input"
    type="file"
    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    class="hidden"
    data-testid="docx-input"
    @change="onInput"
  >

  <UModal
    v-model:open="open"
    title="Import Word document"
    :description="file?.name"
    :dismissible="!busy"
    :close="!busy"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          Replace everything in the editor, or insert the document at the cursor.
          Images in the document are uploaded as part of the import.
        </p>

        <div
          v-if="busy"
          class="space-y-2"
        >
          <UProgress
            :model-value="progress?.done ?? null"
            :max="progress?.total || undefined"
          />
          <p class="text-xs text-muted">
            <template v-if="progress?.total">
              Uploading images: {{ progress.done }} of {{ progress.total }}
            </template>
            <template v-else>
              Converting the document...
            </template>
          </p>
        </div>

        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="error"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          label="Insert at cursor"
          color="neutral"
          variant="outline"
          :disabled="busy"
          @click="run('insert')"
        />
        <UButton
          label="Replace content"
          :loading="busy"
          @click="run('replace')"
        />
      </div>
    </template>
  </UModal>
</template>
