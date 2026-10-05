<script setup lang="ts">
const { users, signInAs } = useSandboxUsers()
</script>

<template>
  <UPageCard
    v-if="users.length"
    title="Sign in as"
    description="Sandbox people, signed in through the real sign-in flow."
    icon="i-lucide-users"
    class="w-full max-w-sm"
  >
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
  </UPageCard>
</template>
