<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Choose a workspace' })

const { orgs } = useOrgs()
const { signOut } = useSignOut()
</script>

<template>
  <div class="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-4 p-4">
    <h1 class="text-xl font-semibold text-highlighted">
      Choose a workspace
    </h1>
    <UPageCard
      v-for="entry in orgs"
      :key="entry.org.id"
      :title="entry.org.name"
      :description="entry.org.isPersonal ? 'Personal' : (entry.role ? `You're ${entry.role === 'admin' ? 'an' : 'a'} ${entry.role}` : 'Shared with you')"
      :icon="entry.org.isPersonal ? 'i-lucide-user' : 'i-lucide-building-2'"
    >
      <div class="flex flex-col">
        <UButton
          v-for="workspace in entry.workspaces"
          :key="workspace.id"
          :to="`/${entry.org.slug}/${workspace.slug}`"
          color="neutral"
          variant="ghost"
          class="justify-between"
          trailing-icon="i-lucide-chevron-right"
        >
          <span class="flex items-center gap-2">
            {{ workspace.name }}
            <UBadge
              :label="workspace.role"
              color="neutral"
              variant="subtle"
              size="sm"
            />
          </span>
        </UButton>
        <p
          v-if="!entry.workspaces.length"
          class="text-sm text-muted"
        >
          No workspaces you can see yet.
        </p>
      </div>
    </UPageCard>
    <UButton
      label="Sign out"
      color="neutral"
      variant="link"
      class="self-center"
      @click="signOut"
    />
  </div>
</template>
