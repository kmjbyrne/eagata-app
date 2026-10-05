<script setup lang="ts">
defineProps<{ title: string, description?: string }>()

const { shell: { brand } } = useAppConfig()
</script>

<!-- The sign-in page's look, for the other signed-out password pages. -->
<template>
  <div class="flex min-h-dvh flex-col items-center justify-center p-4">
    <div class="flex w-full max-w-sm flex-col gap-6">
      <div class="flex flex-col items-center gap-2 text-center">
        <img
          v-if="brand.logo"
          :src="brand.logo"
          alt=""
          class="mb-2 size-12 object-contain"
        >
        <h1 class="text-2xl font-bold text-highlighted">
          {{ title }}
        </h1>
        <p
          v-if="description"
          class="text-sm text-muted"
        >
          {{ description }}
        </p>
      </div>
      <slot />
    </div>
  </div>
</template>
