# @varcharley/editor

A Nuxt layer with a rich-text HTML editor built on Nuxt UI's `UEditor` (Tiptap
v3). It imports Word documents and keeps legacy TinyMCE markup.

## Usage

The host installs `nuxt` and `@nuxt/ui`, registers the `@nuxt/ui` module, and
extends the layer:

```ts
export default defineNuxtConfig({
  extends: ['@varcharley/editor'],
  modules: ['@nuxt/ui']
})
```

Then use the component anywhere:

```vue
<script setup lang="ts">
import type { EditorUpload } from '@varcharley/editor/app/utils/editorUpload'

const html = ref('<p>Hello</p>')

const upload: EditorUpload = async (file) => {
  const body = new FormData()
  body.append('file', file)
  return await $fetch<{ src: string }>('/api/uploads', { method: 'POST', body })
}
</script>

<template>
  <EditorContent v-model="html" :upload="upload" />
</template>
```

The model is an HTML string, in and out.

`:toolbar="false"` hides the fixed toolbar strip. Formatting stays available
through the bubble toolbar over selected text, and the commands after `/`.

## The `upload` contract

```ts
type EditorUpload = (file: File) => Promise<{ src: string }>
```

The editor never stores files itself. It calls `upload` for every image it gets:
the image upload node, a pasted or dropped image, each image embedded in an
imported Word document, and each image saved from the image editor. Resolve with
the public URL of the stored file. Reject to show an error; the editor keeps the
rest of the content.

Pasted images are copied into storage too. Google Docs, and many other apps, put
images on the clipboard embedded as base64; storing those would bloat every
body, so the editor turns each one into a file and sends it through `upload`.
Images still hosted by Google Docs (`*.googleusercontent.com`) are downloaded
first. If the browser can't download one, the editor calls the optional
`fetchRemote(url) => Promise<File>`, which lets the host fetch it server-side;
without it, or if that fails too, the editor warns that the image wasn't saved.
Only images arriving in the paste are touched, never ones already in the body.

The image editor (crop, pan, zoom, rotate, flip) never overwrites the original.
It uploads the result as a new file named `<original>-edited.<ext>`, at the
source's resolution up to 2000px on the long edge, and points the image at the
new URL. Images from another origin must be served with CORS headers, or the
browser won't let the editor read their pixels.

Embedded frames are limited to YouTube (`youtube.com/embed/...`,
`youtube-nocookie.com/embed/...`) and Google Drive previews
(`drive.google.com/file/d/<id>/preview`), over HTTPS. Any other iframe in pasted
or loaded content is dropped, and the kept ones render sandboxed. Video sources
must be http(s) URLs or paths on the same site.
