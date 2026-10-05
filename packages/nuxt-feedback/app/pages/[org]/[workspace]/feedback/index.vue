<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { FeedbackSummaryResponse } from '../../../../../shared/contracts/feedback'

const route = useRoute()
const base = computed(() => `/${route.params.org}/${route.params.workspace}`)
useHead({ title: 'Feedback' })

const { data: items, status } = await useFetch<FeedbackSummaryResponse[]>(() => `/api/orgs/${route.params.org}/workspaces/${route.params.workspace}/feedback`, { default: () => [] })

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
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            label="Send feedback"
            icon="i-lucide-plus"
            :to="`${base}/feedback/new`"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <p class="text-sm text-muted">
        Bugs, ideas and questions you sent from this workspace. Open one to see replies or add more.
      </p>

      <p
        v-if="!items.length && status !== 'pending'"
        class="py-12 text-center text-muted"
      >
        You haven't sent any feedback from this workspace yet.
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
            :to="`${base}/feedback/${row.original.id}`"
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
