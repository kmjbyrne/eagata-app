<script setup lang="ts">
import type { EditorUpload } from '@varcharley/editor/app/utils/editorUpload'

const { workspace } = useCurrentWorkspace()
if (!workspace.value) {
  throw createError({ statusCode: 404, statusMessage: 'Workspace not found' })
}
useHead({ title: 'Editor' })

// A demo of the editor as it is. Nothing is saved, and with no media storage
// yet, images live only in this browser tab.
const html = ref(`<h2>The editor</h2>
<p>Rich text, as HTML in and out. Try <strong>bold</strong>, <em>italics</em>, lists, tables, links and images. Type <code>/</code> for commands, paste from Google Docs, or import a Word document.</p>
<ul><li>Drag an image in, or paste one.</li><li>Click an image to crop or rotate it.</li></ul>`)

const upload: EditorUpload = async file => ({ src: URL.createObjectURL(file) })
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
          description="A demo. Nothing is saved, and images live only in this tab until the foundation has media storage."
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
