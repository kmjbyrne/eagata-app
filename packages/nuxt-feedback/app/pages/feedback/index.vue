<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { FeedbackSummaryResponse } from '../../../shared/contracts/feedback'

useHead({ title: 'Feedback' })

const { data: items, status } = await useFetch<FeedbackSummaryResponse[]>('/api/me/feedback', { default: () => [] })

const columns: TableColumn<FeedbackSummaryResponse>[] = [
  { accessorKey: 'subject', header: 'Subject' },
  { accessorKey: 'kind', header: 'Kind' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'replyCount', header: 'Replies' },
  { accessorKey: 'updatedAt', header: 'Last activity' }
]
</script>

<template>
  <UDashboardPanel id="feedback">
    <template #header>
      <UDashboardNavbar title="Feedback">
        <template #right>
          <UButton
            label="Send feedback"
            icon="i-lucide-plus"
            to="/feedback/new"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <p class="text-sm text-muted">
        Bugs, ideas and questions you've sent. Open one to see replies or add more.
      </p>

      <p
        v-if="!items.length && status !== 'pending'"
        class="py-12 text-center text-muted"
      >
        You haven't sent any feedback yet.
      </p>

      <UTable
        v-else
        :data="items"
        :columns="columns"
        :loading="status === 'pending'"
        class="shrink-0"
      >
        <template #subject-cell="{ row }">
          <ULink
            :to="`/feedback/${row.original.id}`"
            class="block max-w-96 font-medium whitespace-normal text-highlighted hover:underline"
          >
            {{ row.original.subject }}
          </ULink>
        </template>
        <template #kind-cell="{ row }">
          <span class="inline-flex items-center gap-1.5">
            <UIcon
              :name="feedbackKind(row.original.kind).icon"
              class="size-4 text-muted"
            />
            {{ feedbackKind(row.original.kind).label }}
          </span>
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :label="feedbackStatus(row.original.status).label"
            :color="feedbackStatus(row.original.status).color"
            variant="subtle"
          />
        </template>
        <template #updatedAt-cell="{ row }">
          <NuxtTime
            :datetime="row.original.updatedAt"
            date-style="medium"
            time-style="short"
          />
        </template>
      </UTable>
    </template>
  </UDashboardPanel>
</template>
