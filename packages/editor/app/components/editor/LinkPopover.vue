<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'

const props = defineProps<{
  editor: Editor
}>()

const open = ref(false)
const url = ref('')

const active = computed(() => props.editor.isActive('link'))
const disabled = computed(() => {
  if (!props.editor.isEditable) {
    return true
  }
  return props.editor.state.selection.empty && !active.value
})

watch(open, (isOpen) => {
  if (isOpen) {
    url.value = props.editor.getAttributes('link').href ?? ''
  }
})

function setLink() {
  if (!url.value) {
    return
  }
  let chain = props.editor.chain().focus().extendMarkRange('link').setLink({ href: url.value })
  if (props.editor.state.selection.empty && !active.value) {
    chain = chain.insertContent({ type: 'text', text: url.value })
  }
  chain.run()
  open.value = false
}

function removeLink() {
  props.editor.chain().focus().extendMarkRange('link').unsetLink().setMeta('preventAutolink', true).run()
  url.value = ''
  open.value = false
}

function openLink() {
  window.open(url.value, '_blank', 'noopener,noreferrer')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    setLink()
  }
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :ui="{ content: 'p-0.5' }"
  >
    <UTooltip text="Link">
      <UButton
        icon="i-lucide-link"
        color="neutral"
        active-color="primary"
        variant="ghost"
        active-variant="soft"
        size="sm"
        aria-label="Link"
        :active="active"
        :disabled="disabled"
      />
    </UTooltip>

    <template #content>
      <UInput
        v-model="url"
        autofocus
        name="url"
        type="url"
        variant="none"
        placeholder="Paste a link..."
        @keydown="onKeydown"
      >
        <div class="mr-0.5 flex items-center">
          <UButton
            icon="i-lucide-corner-down-left"
            variant="ghost"
            size="sm"
            aria-label="Apply link"
            :disabled="!url"
            @click="setLink"
          />

          <USeparator
            orientation="vertical"
            class="mx-1 h-6"
          />

          <UButton
            icon="i-lucide-external-link"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Open in new window"
            :disabled="!url"
            @click="openLink"
          />

          <UButton
            icon="i-lucide-trash"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Remove link"
            :disabled="!active"
            @click="removeLink"
          />
        </div>
      </UInput>
    </template>
  </UPopover>
</template>
