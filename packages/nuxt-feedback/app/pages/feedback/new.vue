<script setup lang="ts">
import type { FeedbackKindValue, FeedbackResponse } from '../../../shared/contracts/feedback'

useHead({ title: 'Send feedback' })

const toast = useToast()
const upload = useMediaUpload('/api/me/media')
// The workspace they're in, or were last in, for context.
const { org, workspace } = useCurrentWorkspace()

// The page the member came from, so the platform can see where they were.
const pagePath = import.meta.client && typeof history.state?.back === 'string' && !history.state.back.includes('/feedback')
  ? history.state.back as string
  : null

const state = reactive({ kind: 'bug' as FeedbackKindValue, subject: '', body: '' })
const subjectError = ref<string>()
const sending = ref(false)

watch(() => state.subject, (subject) => {
  if (subject.trim()) {
    subjectError.value = undefined
  }
})

async function send() {
  if (!state.subject.trim()) {
    subjectError.value = 'Give your feedback a subject.'
    return
  }
  sending.value = true
  try {
    const from = org.value && workspace.value ? { org: org.value.org.slug, workspace: workspace.value.slug } : null
    const sent = await $fetch<FeedbackResponse>('/api/me/feedback', { method: 'POST', body: { ...state, pagePath, from } })
    toast.add({ title: 'Thanks, your feedback is sent', description: 'Replies will show here.', color: 'success', icon: 'i-lucide-check' })
    await navigateTo(`/feedback/${sent.id}`, { replace: true })
  } catch (failure) {
    const message = (failure as { data?: { message?: string } }).data?.message ?? (failure as Error).message
    toast.add({ title: 'Couldn\'t send your feedback', description: message, color: 'error' })
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <UDashboardPanel
    id="feedback-new"
    :ui="{ body: 'p-0 sm:p-0 gap-0' }"
  >
    <template #header>
      <UDashboardNavbar title="Send feedback">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            label="Send"
            icon="i-lucide-send"
            :loading="sending"
            @click="send"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <EditorContent
        v-model="state.body"
        :upload="upload"
        :toolbar="false"
        placeholder="What happened, or what would help? Paste or drop screenshots straight in."
      >
        <template #header="{ focusBody }">
          <URadioGroup
            v-model="state.kind"
            :items="FEEDBACK_KIND_ITEMS"
            legend="What kind of feedback is it?"
            orientation="horizontal"
            variant="card"
            indicator="hidden"
            class="mb-6"
            :ui="{ fieldset: 'grid grid-cols-2 gap-2 sm:grid-cols-4', item: 'items-start' }"
          />
          <UTextarea
            v-model="state.subject"
            variant="none"
            :rows="1"
            autoresize
            autofocus
            placeholder="Subject"
            aria-label="Subject"
            :maxlength="255"
            :aria-invalid="!!subjectError"
            class="w-full"
            :ui="{ base: 'p-0 text-2xl font-bold text-highlighted sm:text-3xl resize-none overflow-hidden' }"
            @keydown.enter.prevent="focusBody"
          />
          <p
            v-if="subjectError"
            class="mt-1 text-sm text-error"
          >
            {{ subjectError }}
          </p>
          <p
            v-if="pagePath"
            class="mt-1 text-xs text-muted"
          >
            Sent from <code>{{ pagePath }}</code>, so we can see where you were.
          </p>
        </template>
      </EditorContent>
    </template>
  </UDashboardPanel>
</template>
