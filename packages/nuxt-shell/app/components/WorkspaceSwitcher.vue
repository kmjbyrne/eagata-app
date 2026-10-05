<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{ collapsed?: boolean }>()

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
      :content="{ align: 'start', collisionPadding: 12 }"
      :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
    >
      <UButton
        :label="collapsed ? undefined : (current?.name ?? 'Workspaces')"
        icon="i-lucide-layers"
        :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
        color="neutral"
        variant="ghost"
        block
        :square="collapsed"
        class="data-[state=open]:bg-elevated"
      />
    </UDropdownMenu>
    <CreateWorkspaceModal
      v-model:open="creating"
      :org-slug="org.org.slug"
    />
  </template>
</template>
