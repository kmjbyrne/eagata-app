# @kmjbyrne/nuxt-platform

The platform admin area, for the app's operators: organizations, their members,
and users. It is a Nuxt layer on top of `@kmjbyrne/nuxt-shell`.

Platform admins hold the platform role. They create company orgs and users,
assign org members and roles, and deactivate users. Being a platform admin
doesn't make anyone a member of an org.

## Install

The package is published to npm with restricted access, so installing it needs
an npm login with access to the `@kmjbyrne` scope:

```bash
npm login
pnpm add @kmjbyrne/nuxt-platform
```

Extend it only when `NUXT_PLATFORM=true`, so builds without it contain none of
its code:

```ts
const platform = process.env.NUXT_PLATFORM === 'true'

export default defineNuxtConfig({
  extends: [
    '@kmjbyrne/nuxt-shell',
    ...(platform ? ['@kmjbyrne/nuxt-platform'] : [])
  ]
})
```

The layer extends the shell itself, so it can be built and tested on its own.
Nuxt accepts the shell arriving both ways.

## Access

The area lives at `/platform`, in the app's own session, rather than on a
separate host. Access is checked twice, deliberately:

- `server/middleware/platform.ts` answers 401 or 403 early for every
  `/api/protected/` request from anyone but a signed-in platform admin.
- The platform services in `@kmjbyrne/core` check again, so a route the
  middleware misses still can't act for anyone else.

The `platform` page middleware keeps others out of the pages, for their sake
only. The layer adds a "Platform" item to the shell's user menu, shown to
platform admins only.
