<script setup lang="ts">
defineProps<{
  author: string
  fromPlatform: boolean
  createdAt: string
  /** HTML the server sanitised when it was stored. */
  body: string
}>()

const { shell: { brand } } = useAppConfig()
</script>

<template>
  <article
    class="rounded-lg border p-4"
    :class="fromPlatform ? 'border-primary/30 bg-primary/5' : 'border-default bg-default'"
  >
    <header class="mb-2 flex flex-wrap items-center gap-2 text-sm">
      <UAvatar
        :alt="author"
        size="xs"
      />
      <span class="font-medium text-highlighted">{{ author }}</span>
      <UBadge
        v-if="fromPlatform"
        :label="`${brand.name} team`"
        color="primary"
        variant="subtle"
        size="sm"
      />
      <NuxtTime
        :datetime="createdAt"
        date-style="medium"
        time-style="short"
        class="text-muted"
      />
    </header>

    <!-- eslint-disable vue/no-v-html -- sanitised on the server when stored -->
    <div
      class="text-sm text-default [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-default [&_blockquote]:pl-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_h4]:font-semibold [&_img]:my-2 [&_img]:max-h-96 [&_img]:rounded-sm [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-1.5 [&_pre]:overflow-x-auto [&_pre]:rounded-sm [&_pre]:bg-elevated [&_pre]:p-2 [&_table]:my-2 [&_td]:border [&_td]:border-default [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-default [&_th]:bg-elevated [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc [&_ul]:pl-6"
      v-html="body"
    />
    <!-- eslint-enable vue/no-v-html -->
  </article>
</template>
