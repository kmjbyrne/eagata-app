<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { org, workspace: current } = useCurrentWorkspace()
const { workspaces, canCreate } = useWorkspaces(() => org.value?.org.slug)
const creating = ref(false)

const items = computed<DropdownMenuItem[][]>(() => [
  workspaces.value.map(workspace => ({
    label: workspace.name,
    icon: 'i-lucide-layers',
    // A link, not a checkbox item: Nuxt UI renders checkbox items without their link.
    active: workspace.slug === current.value?.slug,
    to: `/${org.value!.org.slug}/${workspace.slug}`
  })),
  ...(canCreate.value ? [[{ label: 'Create workspace', icon: 'i-lucide-plus', onSelect: () => { creating.value = true } }]] : [])
])
</script>

<template>
  <template v-if="org">
    <UDropdownMenu
      :items="items"
      :content="{ align: 'end', collisionPadding: 12 }"
      :ui="{ content: 'min-w-48' }"
    >
      <UButton
        :label="current?.name ?? 'Workspaces'"
        icon="i-lucide-layers"
        trailing-icon="i-lucide-chevrons-up-down"
        color="neutral"
        variant="ghost"
        class="data-[state=open]:bg-elevated"
        :ui="{ label: 'hidden max-w-40 truncate sm:block', trailingIcon: 'hidden sm:block' }"
      />
    </UDropdownMenu>
    <CreateWorkspaceModal
      v-model:open="creating"
      :org-slug="org.org.slug"
    />
  </template>
</template>
