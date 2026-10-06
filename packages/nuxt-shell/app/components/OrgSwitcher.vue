<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { orgs } = useOrgs()
const { org: current } = useCurrentWorkspace()
const { shell: { brand } } = useAppConfig()

// Most people reach one org, their own, so a selector would offer no choice.
// They get the app's brand instead, and Settings lists their orgs.
const single = computed(() => orgs.value.length <= 1)

// Switching navigates. It never changes hidden state.
const items = computed<DropdownMenuItem[][]>(() => [
  orgs.value.map(entry => ({
    label: entry.org.name,
    icon: entry.org.isPersonal ? 'i-lucide-user' : 'i-lucide-building-2',
    // A link, not a checkbox item: Nuxt UI renders checkbox items without their link.
    active: entry.org.slug === current.value?.org.slug,
    to: entry.workspaces[0] ? `/${entry.org.slug}/${entry.workspaces[0].slug}` : '/choose'
  })),
  [{ label: 'All organizations', icon: 'i-lucide-layout-grid', to: '/choose' }]
])
</script>

<template>
  <NuxtLink
    v-if="single"
    to="/"
    class="flex min-w-0 items-center gap-2 px-2.5 py-2"
    :class="[collapsed && 'justify-center px-0']"
  >
    <img
      v-if="brand.logo"
      :src="brand.logo"
      alt=""
      class="size-6 shrink-0 object-contain"
    >
    <span
      v-if="!collapsed || !brand.logo"
      class="truncate font-semibold text-highlighted"
    >{{ brand.name }}</span>
  </NuxtLink>
  <UDropdownMenu
    v-else
    :items="items"
    :content="{ align: 'end', collisionPadding: 12 }"
    :ui="{ content: 'min-w-48' }"
  >
    <UButton
      :label="current?.org.name ?? 'Organizations'"
      :icon="current?.org.isPersonal ? 'i-lucide-user' : 'i-lucide-building-2'"
      trailing-icon="i-lucide-chevrons-up-down"
      color="neutral"
      variant="ghost"
      class="data-[state=open]:bg-elevated"
      :ui="{ label: 'hidden max-w-40 truncate sm:block', trailingIcon: 'hidden sm:block' }"
    />
  </UDropdownMenu>
</template>
