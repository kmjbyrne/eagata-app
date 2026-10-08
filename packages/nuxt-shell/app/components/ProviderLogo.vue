<script setup lang="ts">
defineProps<{ provider: string }>()
</script>

<!-- A provider's own mark where it has one, and a plain key otherwise. -->
<template>
  <GoogleLogo v-if="provider === 'google'" />
  <JanusLogo v-else-if="provider === 'janus'" />
  <UIcon
    v-else
    name="i-lucide-key-round"
  />
</template>
