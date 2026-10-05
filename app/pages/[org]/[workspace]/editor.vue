<script setup lang="ts">
const { workspace } = useCurrentWorkspace()
if (!workspace.value) {
  throw createError({ statusCode: 404, statusMessage: 'Workspace not found' })
}
useHead({ title: 'Editor' })

// A demo of the editor as it is. The text isn't saved. Images are uploaded to
// the workspace's media, as any page's would be.
const html = ref(`<h2>The editor</h2>
<p>Rich text, as HTML in and out. Try <strong>bold</strong>, <em>italics</em>, lists, tables, links and images. Type <code>/</code> for commands, paste from Google Docs, or import a Word document.</p>
<ul><li>Drag an image in, or paste one.</li><li>Click an image to crop or rotate it.</li></ul>`)

const upload = useMediaUpload()
const showHtml = ref(false)
const compact = ref(false)
const toolbar = ref(false)
</script>

<template>
  <UDashboardPanel id="editor-demo">
    <template #header>
      <UDashboardNavbar title="Editor">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <USwitch
            v-model="toolbar"
            label="Toolbar"
          />
          <USwitch
            v-model="compact"
            label="Compact"
          />
          <USwitch
            v-model="showHtml"
            label="Show HTML"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <UAlert
          color="neutral"
          variant="subtle"
          icon="i-lucide-info"
          description="A demo. The text isn't saved. Images are uploaded to this workspace's media."
        />
        <EditorContent
          :key="String(compact)"
          v-model="html"
          :upload="upload"
          :compact="compact"
          :toolbar="toolbar"
        />
        <pre
          v-if="showHtml"
          class="overflow-x-auto rounded-md bg-elevated p-4 text-xs whitespace-pre-wrap"
        >{{ html }}</pre>
      </div>
    </template>
  </UDashboardPanel>
</template>
