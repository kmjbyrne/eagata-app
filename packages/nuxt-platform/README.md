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

## Pages

| Page                           | What it is                                                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/platform/organizations`      | Company orgs, with personal ones on request. "Create organization" asks for a name, a slug and an owner, with a shortcut to create the owner first. |
| `/platform/organizations/:org` | Members and their roles, adding and removing members, workspaces, and changing the slug                                                             |
| `/platform/users`              | Every user, marked platform admin, deactivated, or not signed in yet. "Create user".                                                                |
| `/platform/users/:id`          | Their orgs, and switches for the platform role and deactivation                                                                                     |

Refusals such as "an organization needs at least one owner" come from the
domain, and show as they are.

## API

Every route is under `/api/protected/`, answers 401 to anyone signed out and 403
to anyone but a platform admin, and calls one platform service method.

| Route                                        | What it does                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `GET /organizations`                         | Every org, personal ones included, with member and workspace counts                  |
| `POST /organizations`                        | `{ name, ownerUserId, slug? }`: a company org with its owner and a General workspace |
| `GET /organizations/:org`                    | The org, its members and its workspaces                                              |
| `PATCH /organizations/:org/slug`             | `{ slug }`. The old slug keeps redirecting.                                          |
| `GET /organizations/:org/members`            | The members                                                                          |
| `POST /organizations/:org/members`           | `{ userId, role }`. Never in a personal org.                                         |
| `PATCH /organizations/:org/members/:userId`  | `{ role }`. An org keeps an owner.                                                   |
| `DELETE /organizations/:org/members/:userId` | An org keeps an owner.                                                               |
| `GET /users`                                 | Every user, with whether they have signed in yet                                     |
| `POST /users`                                | `{ displayName, email }`: a user, with their personal org                            |
| `GET /users/:id`                             | The user and their org memberships                                                   |
| `PATCH /users/:id`                           | `{ isPlatformAdmin }` or `{ deactivated }`, one per request                          |

Shapes are Zod schemas in `shared/contracts/platform.ts`. The route tests boot
the layer with `setupApp` from `@kmjbyrne/nuxt-shell/testing`.
