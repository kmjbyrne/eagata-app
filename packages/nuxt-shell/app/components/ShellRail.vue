<script setup lang="ts">
const { sections, active } = useNavSections()
const { prefs, toggle } = useNavPrefs()

const controls = computed(() => [
  {
    key: 'panel',
    label: prefs.value.panelOpen ? 'Collapse panel' : 'Expand panel',
    icon: prefs.value.panelOpen ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open',
    disabled: !active.value,
    onClick: () => toggle('panelOpen')
  },
  {
    key: 'pin',
    label: prefs.value.pinned ? 'Unpin rail' : 'Pin rail',
    icon: prefs.value.pinned ? 'i-lucide-pin-off' : 'i-lucide-pin',
    onClick: () => toggle('pinned')
  }
])
</script>

<template>
  <!-- Narrow, the rail's tooltips stand in for the labels pinning shows. -->
  <nav
    class="flex h-full shrink-0 flex-col gap-1 border-e border-default bg-elevated/50 py-2"
    :class="prefs.pinned ? 'w-44 px-2' : 'w-14 items-center'"
  >
    <UTooltip
      v-for="section in sections"
      :key="section.key"
      :text="section.label"
      :content="{ side: 'right' }"
      :disabled="prefs.pinned"
    >
      <UButton
        :to="section.to"
        :icon="section.icon"
        :label="prefs.pinned ? section.label : undefined"
        :aria-label="section.label"
        :color="section.key === active?.key ? 'primary' : 'neutral'"
        :variant="section.key === active?.key ? 'soft' : 'ghost'"
        :square="!prefs.pinned"
        :block="prefs.pinned"
        :ui="{ base: prefs.pinned ? 'justify-start' : '' }"
      />
    </UTooltip>

    <div class="grow" />

    <UTooltip
      v-for="control in controls"
      :key="control.key"
      :text="control.label"
      :content="{ side: 'right' }"
      :disabled="prefs.pinned"
    >
      <UButton
        :icon="control.icon"
        :label="prefs.pinned ? control.label : undefined"
        :aria-label="control.label"
        :disabled="control.disabled"
        color="neutral"
        variant="ghost"
        :square="!prefs.pinned"
        :block="prefs.pinned"
        :ui="{ base: prefs.pinned ? 'justify-start' : '' }"
        @click="control.onClick"
      />
    </UTooltip>

    <!-- Pinned, the menu opens over its full-width button. Narrow, there is no
         room above a lone avatar, so it opens beside the rail. -->
    <UserMenu
      :collapsed="!prefs.pinned"
      :side="prefs.pinned ? 'top' : 'right'"
      :align="prefs.pinned ? 'center' : 'end'"
    />
  </nav>
</template>
