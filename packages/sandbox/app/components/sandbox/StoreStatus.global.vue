<script setup lang="ts">
import type { JsonStoreStatus } from '@kmjbyrne/json-store'

const toast = useToast()
const { data: status, refresh } = useFetch<JsonStoreStatus | null>('/api/_sandbox/status', { key: 'sandbox-status' })
const resetting = ref(false)

async function reset() {
  resetting.value = true
  try {
    await $fetch('/api/_sandbox/reset', { method: 'POST' })
    await refresh()
    await refreshNuxtData('sandbox-users')
    toast.add({ title: 'Sandbox data reset to its fixtures', color: 'success' })
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <div
    v-if="status"
    class="flex w-full max-w-sm flex-col gap-2"
  >
    <UAlert
      v-if="status.drifted.length"
      color="warning"
      icon="i-lucide-triangle-alert"
      title="Some dev data no longer matches its schema"
      :description="status.drifted.map(report => `${report.collection}: ${report.issues[0]}`).join(' · ')"
    />
    <div class="flex items-center justify-between gap-2 text-xs text-muted">
      <span>Sandbox data{{ status.seededAt ? ` seeded ${new Date(status.seededAt).toLocaleString()}` : '' }}</span>
      <UButton
        label="Reset"
        icon="i-lucide-rotate-ccw"
        size="xs"
        color="neutral"
        variant="outline"
        :loading="resetting"
        @click="reset"
      />
    </div>
  </div>
</template>
