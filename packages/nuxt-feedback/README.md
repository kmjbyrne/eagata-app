# @kmjbyrne/nuxt-feedback

Feedback from workspace members to the platform, with rich text and images, as
basecamp-app has it. The rules live in `@kmjbyrne/core/feedback`.

```ts
const platform = process.env.NUXT_PLATFORM === 'true'

export default defineNuxtConfig({
  extends: [
    '@kmjbyrne/nuxt-shell',
    '@kmjbyrne/nuxt-feedback',
    ...(platform
      ? ['@kmjbyrne/nuxt-platform', '@kmjbyrne/nuxt-feedback/platform']
      : [])
  ]
})
```

It extends `@kmjbyrne/nuxt-media`, for screenshots, and `@varcharley/editor`,
for writing.

## People

Anyone signed in can raise feedback at `/feedback`: a kind (bug, idea, question
or other), a subject, and a rich-text body with images pasted or dropped in.
Feedback is the person's own, the same from every workspace, and it outlives any
workspace. The page they came from, and the workspace they were in, are recorded
for context. People see and answer only their own feedback. Replying to feedback
marked done reopens it. Their images are stored as their own, through
`/api/me/media`.

The layer adds Feedback to the shell's user menu, so it's reachable from any
page.

## The Platform Inbox

`@kmjbyrne/nuxt-feedback/platform` is a sub-layer with the inbox at
`/platform/feedback`, linked from the platform sidebar through its `navItems`.
Platform admins see every workspace's feedback, open first, reply, and set the
status: new, seen or done. Replying to new feedback marks it seen. Images in a
platform reply are stored as the author's own, so they can open them. Extend the
sub-layer only with the platform area, so a build without the platform carries
none of it.

## Storage

Two tables, `feedback` and `feedback_replies`. List the schema in the app's
`drizzle.config.ts`, then run `pnpm db:generate`. Bodies are sanitised on the
way in by `SanitizeHtmlSanitizer`: what the editor makes, minus scripts and
embeds, with images only from the app's own `/media`.

## Routes

| Route                                                | Who             |
| ---------------------------------------------------- | --------------- |
| `GET`, `POST /api/me/feedback`                       | The author      |
| `GET /api/me/feedback/:id`, `POST .../:id/replies`   | The author      |
| `GET /api/protected/feedback`, `GET .../:id`         | Platform admins |
| `POST /api/protected/feedback/:id/replies`, `/media` | Platform admins |
| `PUT /api/protected/feedback/:id/status`             | Platform admins |

## Tests

`test/` boots the platform sub-layer, which includes the member side, with
in-memory feedback and media. The MariaDB store passes
`feedbackRepositoryContract` after the shell's test migrations, with its own
journal: run `pnpm --filter @kmjbyrne/nuxt-feedback db:test-generate` after
changing the schema.
