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
          <span class="flex items-center gap-2 capitalize">
            <ProviderLogo
              :provider="identity.provider"
              class="size-5"
            />
            {{ identity.provider }}
          </span>
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
        class="self-start"
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
  </div>
</template>
