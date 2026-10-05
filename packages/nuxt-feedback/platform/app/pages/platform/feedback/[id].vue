<script setup lang="ts">
import type { FeedbackResponse, FeedbackStatusValue } from '../../../../../shared/contracts/feedback'

definePageMeta({ layout: 'platform', middleware: 'platform' })

const route = useRoute()
const toast = useToast()
const api = computed(() => `/api/protected/feedback/${route.params.id}`)
const { data: feedback, error } = await useFetch<FeedbackResponse>(api)
useHead({ title: () => `${feedback.value?.subject ?? 'Feedback'} · Platform` })

async function setStatus(status: FeedbackStatusValue) {
  try {
    feedback.value = await $fetch<FeedbackResponse>(`${api.value}/status`, { method: 'PUT', body: { status } })
  } catch (failure) {
    toast.add({ title: 'Couldn\'t change the status', description: (failure as { data?: { message?: string } }).data?.message, color: 'error' })
  }
}
</script>

<template>
  <UDashboardPanel id="platform-feedback-thread">
    <template #header>
      <UDashboardNavbar :title="feedback?.subject ?? 'Feedback'">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/platform/feedback"
            aria-label="Back to feedback"
          />
        </template>
        <template
          v-if="feedback"
          #right
        >
          <USelect
            :model-value="feedback.status"
            :items="FEEDBACK_STATUS_ITEMS"
            class="w-32"
            @update:model-value="value => setStatus(value as FeedbackStatusValue)"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <p
        v-if="error"
        class="py-12 text-center text-muted"
      >
        This feedback doesn't exist.
      </p>
      <template v-else-if="feedback">
        <div class="mx-auto flex w-full max-w-3xl flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span>From {{ feedback.author.displayName }}</span>
          <span v-if="feedback.place">in {{ feedback.place.orgName }} · {{ feedback.place.workspaceName }}</span>
          <span class="inline-flex items-center gap-1">
            <UIcon :name="feedbackKind(feedback.kind).icon" />
            {{ feedbackKind(feedback.kind).label }}
          </span>
          <span v-if="feedback.pagePath">on <code>{{ feedback.pagePath }}</code></span>
        </div>
        <FeedbackThread
          :feedback="feedback"
          :upload-url="`${api}/media`"
          :reply-url="`${api}/replies`"
          as-platform
          @replied="updated => feedback = updated"
        />
      </template>
    </template>
  </UDashboardPanel>
</template>
