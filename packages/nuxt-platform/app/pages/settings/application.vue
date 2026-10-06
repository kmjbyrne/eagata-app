<script setup lang="ts">
import type { ApplicationResponse } from '../../../shared/contracts/platform'

definePageMeta({ middleware: 'platform' })
useHead({ title: 'Application · Settings' })

const { data: app, refresh, status } = await useFetch<ApplicationResponse>('/api/protected/application')

const database = computed(() => {
  const state = app.value?.database
  switch (state?.status) {
    case 'current': return { color: 'success' as const, label: 'Up to date', detail: state.applied }
    case 'behind': return { color: 'warning' as const, label: `${state.pending} migration${state.pending === 1 ? '' : 's'} to run`, detail: `At ${state.applied}, this build ships ${state.latest}` }
    case 'ahead': return { color: 'warning' as const, label: 'Ahead of this build', detail: 'A newer build migrated the database' }
    case 'none': return { color: 'neutral' as const, label: 'No database', detail: 'Running on the sandbox data' }
    default: return { color: 'neutral' as const, label: 'Unknown', detail: 'The migration table couldn\'t be read' }
  }
})

const slotColor = computed(() => ({ blue: 'info', green: 'success' } as const)[app.value?.slot as 'blue' | 'green'] ?? 'neutral')
</script>

<template>
  <div
    v-if="app"
    class="flex flex-col gap-6"
  >
    <UPageCard
      title="This deployment"
      description="Which build is answering this request."
      variant="subtle"
    >
      <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt class="text-muted">
          Slot
        </dt>
        <dd>
          <UBadge
            :label="app.slot ?? 'Single'"
            :color="slotColor"
            variant="subtle"
            class="capitalize"
          />
        </dd>
        <dt class="text-muted">
          Version
        </dt>
        <dd>{{ app.version || 'Unversioned' }}</dd>
        <dt class="text-muted">
          Commit
        </dt>
        <dd>
          <code>{{ app.commit }}</code>
          <span
            v-if="app.commitDate"
            class="text-muted"
          >,
            <NuxtTime
              :datetime="app.commitDate"
              date-style="medium"
              time-style="short"
            />
          </span>
        </dd>
        <dt class="text-muted">
          Built
        </dt>
        <dd>
          <NuxtTime
            :datetime="app.builtAt"
            date-style="medium"
            time-style="short"
          />
        </dd>
        <dt class="text-muted">
          Running since
        </dt>
        <dd>
          <NuxtTime
            :datetime="app.startedAt"
            date-style="medium"
            time-style="short"
          />
        </dd>
        <dt class="text-muted">
          Host
        </dt>
        <dd><code>{{ app.host }}</code></dd>
        <dt class="text-muted">
          Node
        </dt>
        <dd>{{ app.node }}</dd>
        <dt class="text-muted">
          Platform area
        </dt>
        <dd>{{ app.platform ? 'Built in' : 'Not built in' }}</dd>
      </dl>
    </UPageCard>

    <UPageCard
      title="Database"
      variant="subtle"
    >
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <UBadge
          :label="database.label"
          :color="database.color"
          variant="subtle"
        />
        <span class="text-muted">{{ database.detail }}</span>
      </div>
      <UButton
        label="Check again"
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="outline"
        :loading="status === 'pending'"
        class="w-fit"
        @click="() => refresh()"
      />
    </UPageCard>
  </div>
</template>
