<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const { shell: { brand } } = useAppConfig()

// Only a missing page says so. Anything else gets the same plain message, so
// nothing about the server's internals reaches the visitor.
const notFound = computed(() => props.error.statusCode === 404)
const title = computed(() => notFound.value ? 'Page not found' : 'Something went wrong')
const description = computed(() => notFound.value
  ? 'This page doesn\'t exist, or you don\'t have access to it.'
  : 'We couldn\'t load this page. Try again in a few minutes.')

useHead({ title })

const home = () => clearError({ redirect: '/' })
</script>

<template>
  <UApp>
    <div class="flex min-h-dvh flex-col items-center justify-center gap-6 p-4 text-center">
      <img
        v-if="brand.logo"
        :src="brand.logo"
        alt=""
        class="size-12 object-contain"
      >
      <div class="flex max-w-sm flex-col gap-2">
        <p class="text-sm font-medium text-muted">
          {{ error.statusCode }}
        </p>
        <h1 class="text-2xl font-bold text-highlighted">
          {{ title }}
        </h1>
        <p class="text-sm text-muted">
          {{ description }}
        </p>
      </div>
      <UButton
        label="Go home"
        icon="i-lucide-house"
        @click="home"
      />
    </div>
  </UApp>
</template>
