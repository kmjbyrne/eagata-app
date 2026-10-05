<script setup lang="ts">
const { users, signInAs } = useSandboxUsers()
</script>

<template>
  <div
    v-if="users.length"
    class="flex w-full max-w-sm flex-col gap-3"
  >
    <USeparator
      label="or sign in as a test persona"
      :ui="{ label: 'text-xs text-muted' }"
    />
    <div class="flex flex-col">
      <UButton
        v-for="user in users"
        :key="user.id"
        color="neutral"
        variant="ghost"
        class="justify-start"
        @click="signInAs(user.email)"
      >
        <span class="flex min-w-0 flex-col text-left">
          <span class="truncate text-highlighted">{{ user.name }}</span>
          <span class="truncate text-xs font-normal text-muted">{{ user.description ?? user.email }}</span>
        </span>
      </UButton>
    </div>
  </div>
</template>
