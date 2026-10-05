<script setup lang="ts">
import type { HomeResponse } from '../../shared/contracts/me'

// The server decides: the last-used workspace, the only org's first workspace, or /choose.
const { path } = await useRequestFetch()<HomeResponse>('/api/me/home')
await navigateTo(path, { replace: true })
</script>

<template>
  <div />
</template>
