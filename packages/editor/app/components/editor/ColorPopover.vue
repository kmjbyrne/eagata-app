<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'

const props = defineProps<{
  editor: Editor
}>()

const TEXT = ['#000000', '#4d4d4d', '#e03e2d', '#e67e23', '#f1c40f', '#2dc26b', '#4d7471', '#3598db', '#b96ad9']
const HIGHLIGHT = ['#fbeeb8', '#bfedd2', '#c2e0f4', '#eccafa', '#f8cac6', '#ecf0f1']

const color = computed(() => props.editor.getAttributes('textStyle').color as string | undefined)
const background = computed(() => props.editor.getAttributes('textStyle').backgroundColor as string | undefined)

function setColor(value?: string) {
  const chain = props.editor.chain().focus()
  if (value) {
    chain.setColor(value).run()
  } else {
    chain.unsetColor().run()
  }
}

function setBackground(value?: string) {
  const chain = props.editor.chain().focus()
  if (value) {
    chain.setBackgroundColor(value).run()
  } else {
    chain.unsetBackgroundColor().run()
  }
}
</script>

<template>
  <UPopover :ui="{ content: 'p-3 w-60 space-y-3' }">
    <UTooltip text="Text colour and highlight">
      <UButton
        icon="i-lucide-palette"
        color="neutral"
        variant="ghost"
        active-color="primary"
        active-variant="soft"
        size="sm"
        aria-label="Text colour and highlight"
        :active="!!color || !!background"
        :disabled="!editor.isEditable"
      />
    </UTooltip>

    <template #content>
      <div
        v-for="group in [
          { label: 'Text colour', values: TEXT, current: color, set: setColor },
          { label: 'Highlight', values: HIGHLIGHT, current: background, set: setBackground }
        ]"
        :key="group.label"
      >
        <p class="mb-1.5 text-xs font-medium text-muted">
          {{ group.label }}
        </p>
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-for="value in group.values"
            :key="value"
            type="button"
            class="size-5 rounded-sm ring-1 ring-default ring-inset"
            :class="group.current === value && 'outline-2 outline-offset-1 outline-primary'"
            :style="{ backgroundColor: value }"
            :aria-label="`${group.label} ${value}`"
            @click="group.set(value)"
          />
          <UButton
            icon="i-lucide-ban"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="`Remove ${group.label.toLowerCase()}`"
            @click="group.set()"
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>
