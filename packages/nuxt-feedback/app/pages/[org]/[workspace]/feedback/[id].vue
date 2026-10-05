<script setup lang="ts">
import type { FeedbackResponse } from '../../../../../shared/contracts/feedback'

const route = useRoute()
const base = computed(() => `/${route.params.org}/${route.params.workspace}`)
const api = computed(() => `/api/orgs/${route.params.org}/workspaces/${route.params.workspace}/feedback/${route.params.id}`)

const { data: feedback, error } = await useFetch<FeedbackResponse>(api)
if (error.value) {
  throw createError({ statusCode: error.value.statusCode ?? 404, statusMessage: 'Feedback not found', fatal: true })
}
useHead({ title: () => feedback.value?.subject ?? 'Feedback' })
</script>

<template>
  <UDashboardPanel
    v-if="feedback"
    id="feedback-thread"
  >
    <template #header>
      <UDashboardNavbar :title="feedback.subject">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            :to="`${base}/feedback`"
            aria-label="Back to feedback"
          />
        </template>
        <template #right>
          <UBadge
            :label="feedbackStatus(feedback.status).label"
            :color="feedbackStatus(feedback.status).color"
            variant="subtle"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <FeedbackThread
        :feedback="feedback"
        :reply-url="`${api}/replies`"
        @replied="updated => feedback = updated"
      />
    </template>
  </UDashboardPanel>
</template>
