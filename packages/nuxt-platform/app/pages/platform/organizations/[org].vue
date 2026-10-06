<script setup lang="ts">
import type { PlatformOrgDetailResponse } from '../../../../shared/contracts/platform'

definePageMeta({ layout: 'platform', middleware: 'platform' })

const route = useRoute()
const api = useApi()
const act = usePlatformAction()
const slug = computed(() => String(route.params.org))
const { data: detail, refresh, error } = await useAsyncData(() => `platform:org:${slug.value}`, () => api<PlatformOrgDetailResponse>(`/api/protected/organizations/${slug.value}`))
useHead({ title: () => `${detail.value?.org.name ?? 'Organization'} · Platform` })

const adding = ref(false)
const changingSlug = ref(false)
const roles = [{ label: 'Owner', value: 'owner' }, { label: 'Admin', value: 'admin' }, { label: 'Member', value: 'member' }]
const members = computed(() => detail.value?.members ?? [])

const changeRole = (member: PlatformOrgDetailResponse['members'][number], role: string) =>
  act(() => api(`/api/protected/organizations/${slug.value}/members/${member.user.id}`, { method: 'PATCH', body: { role } }), `${member.user.displayName} is now ${role === 'owner' || role === 'admin' ? 'an' : 'a'} ${role}`)
    .then(() => refresh())

const { shell } = useAppConfig()
const featureLabel = (feature: string) => shell.features[feature]?.label ?? feature

const toggleFeature = (entry: PlatformOrgDetailResponse['features'][number], on: boolean) =>
  act(() => api(`/api/protected/organizations/${slug.value}/features/${entry.feature}`, { method: on ? 'PUT' : 'DELETE' }), `${featureLabel(entry.feature)} is ${on ? 'on' : 'off'} for ${detail.value?.org.name}`)
    .then(() => refresh())

const remove = (member: PlatformOrgDetailResponse['members'][number]) =>
  act(() => api(`/api/protected/organizations/${slug.value}/members/${member.user.id}`, { method: 'DELETE' }), `Removed ${member.user.displayName}`)
    .then(() => refresh())
</script>

<template>
  <UDashboardPanel id="platform-organization">
    <template #header>
      <UDashboardNavbar :title="detail?.org.name ?? 'Organization'">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            v-if="detail"
            label="Change slug"
            icon="i-lucide-link"
            color="neutral"
            variant="outline"
            @click="changingSlug = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        title="This organization can't be found"
        :description="`Nothing has the slug /${slug}. It may have changed.`"
      />
      <div
        v-else-if="detail"
        class="mx-auto flex w-full max-w-3xl flex-col gap-6"
      >
        <div class="flex flex-wrap items-center gap-2 text-sm text-muted">
          <UBadge
            :label="detail.org.isPersonal ? 'Personal' : 'Company'"
            color="neutral"
            variant="subtle"
          />
          <span>/{{ detail.org.slug }}</span>
          <span v-if="detail.org.previousSlugs.length">· previously {{ detail.org.previousSlugs.map(old => `/${old}`).join(', ') }}, still redirecting</span>
        </div>

        <UPageCard
          title="Members"
          variant="subtle"
        >
          <template
            v-if="!detail.org.isPersonal"
            #links
          >
            <UButton
              label="Add member"
              icon="i-lucide-user-plus"
              @click="adding = true"
            />
          </template>
          <ul class="divide-y divide-default">
            <li
              v-for="member in members"
              :key="member.user.id"
              class="flex items-center justify-between gap-4 py-2"
            >
              <NuxtLink :to="`/platform/users/${member.user.id}`">
                <UUser
                  :name="member.user.displayName"
                  :description="member.user.deactivatedAt ? `${member.user.email} · deactivated` : member.user.email"
                  :avatar="{ src: member.user.avatarUrl ?? undefined, alt: member.user.displayName }"
                />
              </NuxtLink>
              <div class="flex items-center gap-2">
                <USelect
                  :model-value="member.role"
                  :items="roles"
                  :disabled="detail.org.isPersonal"
                  class="w-32"
                  @update:model-value="changeRole(member, String($event))"
                />
                <UButton
                  v-if="!detail.org.isPersonal"
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  :aria-label="`Remove ${member.user.displayName}`"
                  @click="remove(member)"
                />
              </div>
            </li>
          </ul>
          <p
            v-if="detail.org.isPersonal"
            class="text-sm text-muted"
          >
            A personal organization has one member. Its workspaces are shared through workspace members instead.
          </p>
        </UPageCard>

        <UPageCard
          title="Workspaces"
          variant="subtle"
        >
          <ul class="divide-y divide-default">
            <li
              v-for="workspace in detail.workspaces"
              :key="workspace.id"
              class="flex items-center justify-between py-2"
            >
              <span>{{ workspace.name }}</span>
              <span class="text-sm text-muted">/{{ detail.org.slug }}/{{ workspace.slug }}</span>
            </li>
          </ul>
        </UPageCard>

        <UPageCard
          title="Features"
          description="Features still being built. Each is off for every organization until switched on here."
          variant="subtle"
        >
          <ul
            v-if="detail.features.length"
            class="divide-y divide-default"
          >
            <li
              v-for="entry in detail.features"
              :key="entry.feature"
              class="flex items-center justify-between gap-4 py-2"
            >
              <div class="min-w-0">
                <p class="font-medium">
                  {{ featureLabel(entry.feature) }}
                </p>
                <p
                  v-if="shell.features[entry.feature]?.description"
                  class="text-sm text-muted"
                >
                  {{ shell.features[entry.feature]?.description }}
                </p>
                <p
                  v-if="entry.enabledAt"
                  class="text-sm text-muted"
                >
                  On since
                  <NuxtTime
                    :datetime="entry.enabledAt"
                    date-style="medium"
                  />
                  <template v-if="entry.enabledBy">
                    by {{ entry.enabledBy.displayName }}
                  </template>
                </p>
              </div>
              <USwitch
                :model-value="entry.enabledAt !== null"
                :aria-label="`${featureLabel(entry.feature)} for ${detail.org.name}`"
                @update:model-value="toggleFeature(entry, $event)"
              />
            </li>
          </ul>
          <p
            v-else
            class="text-sm text-muted"
          >
            No features to switch on. A layer declares one under <code>shell.features</code> in its app config.
          </p>
        </UPageCard>
      </div>

      <template v-if="detail">
        <PlatformAddMemberModal
          v-model:open="adding"
          :org-slug="detail.org.slug"
          :member-ids="members.map(member => member.user.id)"
          @added="refresh()"
        />
        <PlatformChangeSlugModal
          v-model:open="changingSlug"
          :org="detail.org"
        />
      </template>
    </template>
  </UDashboardPanel>
</template>
