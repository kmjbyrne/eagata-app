# @kmjbyrne/nuxt-media

Images uploaded in a workspace, or by a person as their own, such as feedback
screenshots. Kept on local disk for now, behind core's `MediaStorage` port, so
S3 can replace it without touching anything that stores image URLs.

```ts
export default defineNuxtConfig({
  extends: ['@kmjbyrne/nuxt-shell', '@kmjbyrne/nuxt-media']
})
```

The rules live in `@kmjbyrne/core/media`. This layer stores and serves the
files.

## Access

Anyone in a workspace can upload to it, through the `media.upload` permission.
An image is served only to people who can see its workspace, and to platform
admins, who read feedback from workspaces they don't belong to. Anyone else gets
404, so a key reveals nothing.

Keys never change, so images are served with
`Cache-Control: private, max-age=31536000, immutable`. The browser keeps each
one, and the access check runs once per image, not once per view.

## Routes

| Route                                             | What it does                                           |
| ------------------------------------------------- | ------------------------------------------------------ |
| `POST /api/orgs/:org/workspaces/:workspace/media` | One image as multipart `file`. Answers `{ key, src }`. |
| `POST /api/me/media`                              | One image of the signed-in user's own                  |
| `GET /media/...`                                  | The image, to people who may see it                    |

Content stores `src`, an app-owned URL, never a storage URL.

In pages, `useMediaUpload()` uploads to the workspace in the URL and resolves
with `{ key, src }`, in the shape the editor's `upload` prop takes:

```vue
<EditorContent v-model="html" :upload="useMediaUpload()" />
```

Pass a URL for a route that stores images its own way, such as a platform
reply's.

## Settings

| Setting          | What it does                                                              | Default            |
| ---------------- | ------------------------------------------------------------------------- | ------------------ |
| `NUXT_MEDIA_DIR` | Where files go, relative to where the server starts. In Docker, a volume. | `./instance/media` |

Only JPEG, PNG, GIF and WebP up to 15 MB are accepted, judged by the file's own
bytes. Uploads are served with `X-Content-Type-Options: nosniff` and a
`Content-Security-Policy` that allows nothing, so a file can never run as a
page.
