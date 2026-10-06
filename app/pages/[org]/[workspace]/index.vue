<script setup lang="ts">
const { org, workspace } = useCurrentWorkspace()
if (!workspace.value) {
  throw createError({ statusCode: 404, statusMessage: 'Workspace not found' })
}
useHead({ title: () => workspace.value?.name ?? 'Workspace' })
</script>

<template>
  <UDashboardPanel id="workspace-home">
    <template #header>
      <UDashboardNavbar :title="workspace?.name">
        <template #right>
          <UBadge
            :label="workspace?.role"
            color="neutral"
            variant="subtle"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UEmpty
        icon="i-lucide-layers"
        :title="`${workspace?.name} in ${org?.org.name}`"
        description="The workspace home. An app puts its own features here."
      />
    </template>
  </UDashboardPanel>
</template>
