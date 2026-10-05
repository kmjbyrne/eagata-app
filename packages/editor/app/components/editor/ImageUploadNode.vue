<script setup lang="ts">
import type { NodeViewProps } from '@tiptap/vue-3'
import { NodeViewWrapper } from '@tiptap/vue-3'
import type { ImageUploadOptions } from '../../extensions/ImageUpload'

const props = defineProps<NodeViewProps>()

const error = ref<string>()
const loading = ref(false)
const fileUpload = useTemplateRef('fileUpload')

onMounted(() => {
  const storage = props.editor.storage.imageUpload
  if (storage.openPicker) {
    storage.openPicker = false
    fileUpload.value?.inputRef?.click()
  }
})

async function onFile(file: File | null | undefined) {
  const upload = (props.extension.options as ImageUploadOptions).upload
  if (!file || !upload) {
    return
  }
  loading.value = true
  error.value = undefined
  try {
    const { src } = await upload(file)
    const pos = props.getPos()
    if (typeof pos !== 'number') {
      return
    }
    props.editor.chain().focus()
      .insertContentAt({ from: pos, to: pos + props.node.nodeSize }, { type: 'image', attrs: { src, alt: '' } })
      .run()
  } catch (e) {
    error.value = (e as Error).message || 'The upload failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <NodeViewWrapper>
    <UFileUpload
      ref="fileUpload"
      accept="image/*"
      label="Upload an image"
      :description="error || 'Drop an image here, or click to choose one'"
      :preview="false"
      :disabled="loading"
      class="min-h-48"
      :ui="{ description: error ? 'text-error' : '' }"
      @update:model-value="onFile"
    >
      <template #leading>
        <UAvatar
          :icon="error ? 'i-lucide-alert-circle' : loading ? 'i-lucide-loader-circle' : 'i-lucide-image'"
          size="xl"
          :ui="{ icon: [loading && 'animate-spin', error && 'text-error'] }"
        />
      </template>
    </UFileUpload>
  </NodeViewWrapper>
</template>
