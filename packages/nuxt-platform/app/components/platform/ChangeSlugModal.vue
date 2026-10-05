<script setup lang="ts">
import type { PlatformOrg } from '../../../shared/contracts/platform'

const props = defineProps<{ org: PlatformOrg }>()
const open = defineModel<boolean>('open', { default: false })

const api = useApi()
const slug = ref('')
const error = ref<string>()
const saving = ref(false)

watch(open, (isOpen) => {
  if (isOpen) {
    slug.value = props.org.slug
    error.value = undefined
  }
})

async function save() {
  saving.value = true
  error.value = undefined
  try {
    const org = await api<PlatformOrg>(`/api/protected/organizations/${props.org.slug}/slug`, { method: 'PATCH', body: { slug: slug.value } })
    open.value = false
    await navigateTo(`/platform/organizations/${org.slug}`, { replace: true })
  } catch (failure) {
    error.value = (failure as { data?: { message?: string } }).data?.message ?? (failure as Error).message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Change slug"
    :description="`Links using /${org.slug} will keep redirecting to the new slug, and no other organization can ever take it.`"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="save"
      >
        <SlugInput
          v-model="slug"
          :name="org.name"
          :error="error"
        />
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="open = false"
          />
          <UButton
            type="submit"
            label="Change"
            :loading="saving"
            :disabled="!slug || slug === org.slug"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
