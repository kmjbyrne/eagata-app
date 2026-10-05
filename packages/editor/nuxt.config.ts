export default defineNuxtConfig({
  vite: {
    optimizeDeps: {
      // Nuxt UI serves Tiptap unbundled. Pre-bundling these would give them a
      // second copy of ProseMirror, and the editor fails with "Adding
      // different instances of a keyed plugin".
      exclude: [
        '@tiptap/extension-table',
        '@tiptap/extension-text-align',
        '@tiptap/extension-text-style',
        '@tiptap/extensions',
        '@tiptap/pm'
      ]
    }
  }
})
