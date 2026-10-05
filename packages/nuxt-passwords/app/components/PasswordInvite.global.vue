<script setup lang="ts">
const props = defineProps<{ userId: string }>()

const toast = useToast()
const sending = ref(false)

async function send() {
  sending.value = true
  try {
    await $fetch(`/api/protected/users/${props.userId}/password-invite`, { method: 'POST' })
    toast.add({ title: 'Sent a link to set their password. It lasts 72 hours.', color: 'success' })
  } catch (failure) {
    toast.add({ title: failureMessage(failure), color: 'error' })
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <UPageCard
    title="Password"
    description="Email them a link to choose a password. Any earlier link stops working."
    variant="subtle"
  >
    <UButton
      label="Email a set-password link"
      icon="i-lucide-mail"
      color="neutral"
      variant="outline"
      :loading="sending"
      class="self-start"
      @click="send"
    />
  </UPageCard>
</template>
