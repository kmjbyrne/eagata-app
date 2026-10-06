<script setup lang="ts">
import type { NavSection } from '../composables/useNavSections'

defineProps<{ section: NavSection }>()
</script>

<template>
  <div class="flex h-full flex-col gap-3 p-3">
    <h2 class="px-2 pt-1 text-sm font-semibold text-highlighted">
      {{ section.label }}
    </h2>

    <ul
      v-if="section.items.length"
      class="flex flex-col gap-0.5"
    >
      <li
        v-for="item in section.items"
        :key="item.path"
      >
        <UButton
          v-if="item.to"
          :to="item.to"
          :icon="item.icon"
          :label="item.label"
          :color="item.active ? 'primary' : 'neutral'"
          :variant="item.active ? 'soft' : 'ghost'"
          block
          class="justify-start"
        />
        <span
          v-else
          class="flex cursor-default items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted"
        >
          <UIcon
            v-if="item.icon"
            :name="item.icon"
            class="size-5 shrink-0"
          />
          {{ item.label }}
        </span>
      </li>
    </ul>

    <p
      v-else
      class="px-2 text-sm text-dimmed"
    >
      Nothing here yet.
    </p>
  </div>
</template>
