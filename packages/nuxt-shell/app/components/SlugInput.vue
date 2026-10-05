<script setup lang="ts">
import { SLUG_MAX_LENGTH, SLUG_RULES, suggestSlug } from '../../shared/contracts/slug'

const props = defineProps<{
  /** The name the slug is suggested from, until the slug is edited by hand. */
  name: string
  error?: string
}>()
const slug = defineModel<string>({ required: true })
const edited = ref(false)

function suggest(name: string) {
  try {
    return suggestSlug(name)
  } catch {
    return ''
  }
}

watch(() => props.name, (name) => {
  if (!edited.value) {
    slug.value = suggest(name)
  }
}, { immediate: true })

function onInput(value: string) {
  edited.value = true
  slug.value = value
}
</script>

<template>
  <UFormField
    label="Slug"
    name="slug"
    :help="error ? undefined : SLUG_RULES"
    :error="error"
  >
    <UInput
      :model-value="slug"
      :maxlength="SLUG_MAX_LENGTH"
      class="w-full"
      @update:model-value="onInput(String($event))"
    />
  </UFormField>
</template>
