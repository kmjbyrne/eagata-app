<script setup lang="ts">
import type { ConnectOutcome } from '../../../shared/contracts/auth'

useHead({ title: 'Security · Settings' })

const { me } = useMe()
const { shell } = useAppConfig()
const { public: { signInLabel, signInProvider } } = useRuntimeConfig()
const route = useRoute()

// "Continue with Google" names the provider, so the connect button can too.
const provider = computed(() => signInLabel.replace(/^Continue with\s+/i, ''))

const outcomes: Record<ConnectOutcome, { color: 'success' | 'error' | 'neutral', text: string }> = {
  'connected': { color: 'success', text: 'Connected. You can now sign in with it.' },
  'in-use': { color: 'error', text: 'That account is already linked to someone else.' },
  'mismatch': { color: 'error', text: 'You already have a different account linked at that provider.' },
  'cancelled': { color: 'neutral', text: 'Connecting was cancelled.' },
  'provider': { color: 'error', text: 'The provider could not confirm the account. Try again.' }
}
const outcome = computed(() => outcomes[route.query.connect as ConnectOutcome])

const confirming = ref(false)
const confirmEmail = ref('')
const deactivating = ref(false)
const deactivateError = ref<string>()

async function deactivate() {
  deactivating.value = true
  deactivateError.value = undefined
  try {
    await $fetch('/api/me/deactivate', { method: 'POST', body: { email: confirmEmail.value } })
    await navigateTo('/login?error=deactivated', { external: true })
  } catch (failure) {
    deactivateError.value = (failure as { data?: { message?: string } }).data?.message ?? 'Something went wrong. Try again.'
  } finally {
    deactivating.value = false
  }
}
</script>

<template>
  <div
    v-if="me"
    class="flex flex-col gap-6"
  >
    <UAlert
      v-if="outcome"
      :color="outcome.color"
      variant="subtle"
      :description="outcome.text"
    />

    <UPageCard
      title="Sign-in methods"
      description="The accounts you can sign in with."
      variant="subtle"
    >
      <ul class="divide-y divide-default">
        <li
          v-for="identity in me.identities"
          :key="identity.provider"
          class="flex items-center justify-between gap-4 py-2"
        >
          <div class="flex items-center gap-3">
            <ProviderLogo
              :provider="identity.provider"
              class="size-5"
            />
            <div>
              <p class="capitalize">
                {{ identity.provider }}
              </p>
              <p class="text-sm text-muted">
                Linked
                <NuxtTime
                  :datetime="identity.linkedAt"
                  date-style="medium"
                  time-style="short"
                />
              </p>
            </div>
          </div>
          <UBadge
            label="Connected"
            color="success"
            variant="subtle"
          />
        </li>
      </ul>
      <p
        v-if="!me.identities.length"
        class="text-sm text-muted"
      >
        No accounts linked yet.
      </p>
      <UButton
        v-if="!me.providerLinked"
        :label="`Connect ${provider}`"
        to="/api/auth/login?intent=connect"
        external
        color="neutral"
        variant="outline"
        class="w-fit self-start"
      >
        <template #leading>
          <ProviderLogo
            :provider="signInProvider"
            class="size-5"
          />
        </template>
      </UButton>
    </UPageCard>

    <component
      :is="name"
      v-for="name in shell.securityExtras"
      :key="name"
    />

    <UPageCard
      title="Account"
      description="Deactivating signs you out everywhere and stops you signing in. Nothing of yours is removed, and an administrator can reactivate you."
      variant="subtle"
      :ui="{ root: 'ring-error/30' }"
    >
      <UButton
        label="Deactivate account"
        color="error"
        class="w-fit self-start"
        @click="confirming = true"
      />
    </UPageCard>

    <UModal
      v-model:open="confirming"
      title="Deactivate your account?"
      :description="`Type ${me.email} to confirm.`"
    >
      <template #body>
        <form
          class="flex flex-col gap-3"
          @submit.prevent="deactivate"
        >
          <UAlert
            v-if="deactivateError"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :description="deactivateError"
          />
          <UInput
            v-model="confirmEmail"
            :placeholder="me.email"
            autocomplete="off"
            class="w-full"
          />
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              @click="confirming = false"
            />
            <UButton
              type="submit"
              label="Deactivate"
              color="error"
              :loading="deactivating"
              :disabled="confirmEmail.trim().toLowerCase() !== me.email"
            />
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
