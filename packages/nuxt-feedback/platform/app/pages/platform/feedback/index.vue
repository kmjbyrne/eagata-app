<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { FeedbackSummaryResponse } from '../../../../../shared/contracts/feedback'

definePageMeta({ layout: 'platform', middleware: 'platform' })
useHead({ title: 'Feedback · Platform' })

const { data: items, status } = await useFetch<FeedbackSummaryResponse[]>('/api/protected/feedback', { default: () => [] })

const filter = ref<'open' | 'all'>('open')
const shown = computed(() => filter.value === 'all' ? items.value : items.value.filter(item => item.status !== 'done'))

const columns: TableColumn<FeedbackSummaryResponse>[] = [
  { accessorKey: 'subject', header: 'Subject' },
  { accessorKey: 'place', header: 'From' },
  { accessorKey: 'kind', header: 'Kind' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'replyCount', header: 'Replies' },
  { accessorKey: 'updatedAt', header: 'Last activity' }
]
</script>

<template>
  <UDashboardPanel id="platform-feedback">
    <template #header>
      <UDashboardNavbar title="Feedback">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UTabs
            v-model="filter"
            :items="[{ label: 'Open', value: 'open' }, { label: 'All', value: 'all' }]"
            :content="false"
            size="xs"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <p
        v-if="!shown.length && status !== 'pending'"
        class="py-12 text-center text-muted"
      >
        {{ filter === 'open' ? 'Nothing open. All feedback is done.' : 'No feedback yet.' }}
      </p>

      <UTable
        v-else
        :data="shown"
        :columns="columns"
        :loading="status === 'pending'"
        class="shrink-0"
      >
        <template #subject-cell="{ row }">
          <ULink
            :to="`/platform/feedback/${row.original.id}`"
            class="block max-w-96 font-medium whitespace-normal text-highlighted hover:underline"
          >
            {{ row.original.subject }}
          </ULink>
          <span class="text-xs text-muted">{{ row.original.author.displayName }}</span>
        </template>
        <template #place-cell="{ row }">
          <span class="text-sm">{{ row.original.place.orgName }} · {{ row.original.place.workspaceName }}</span>
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
