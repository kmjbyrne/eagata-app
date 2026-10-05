<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { users, signInAs } = useSandboxUsers()

const items = computed<DropdownMenuItem[]>(() => users.value.map(user => ({
  label: user.name,
  description: user.description,
  onSelect: () => signInAs(user.email)
})))
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'start' }"
  >
    <UButton
      label="Switch user"
      icon="i-lucide-users"
      color="neutral"
      variant="ghost"
      block
      class="justify-start"
    />
  </UDropdownMenu>
</template>
