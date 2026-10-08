# @kmjbyrne/nuxt-shell

The Nuxt layer every app on the foundation extends. It is the shell an app runs
in: sign-in, sessions, the org and workspace routes and pages, and the container
where services get their adapters. An app adds its own features inside it.

## Install

The package is published to npm with restricted access, so installing it needs
an npm login with access to the `@kmjbyrne` scope:

```bash
npm login
pnpm add @kmjbyrne/nuxt-shell drizzle-orm mysql2
```

`drizzle-orm`, `mysql2`, `zod` and `h3` are peer dependencies. The app installs
them, so it and the shell share one copy. Two copies of `drizzle-orm` don't
recognise each other's tables.

Inside this repository, depend on it from the workspace instead. Then extend it
in the app's `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  extends: ['@kmjbyrne/nuxt-shell']
})
```

## Errors

Routes the app fetches use `defineServiceHandler`, which maps domain errors to
statuses and JSON. Routes the browser navigates to, such as sign-in and its
callback, use `defineNavigationHandler`: any failure redirects to a page, with
the error logged. Pages that fail render `app/error.vue`, which shows "Page not
found" for a 404 and a plain message for anything else, never the server's
details.

## Request Logging

The shell includes [evlog](https://github.com/evloghq/evlog). Every `/api`
request writes one wide event: method, path, status, duration, request id, the
signed-in user's id, and any error. Output is readable in dev and JSON in
production. Domain errors that map to 4xx log as warnings, and anything else
thrown logs as an error. Passwords, tokens and OAuth codes are redacted, along
with evlog's built-in patterns, such as emails.

Name the app in its `nuxt.config.ts`:

```ts
evlog: {
  env: {
    service: 'my-app'
  }
}
```

Add fields to the current request's event from a route:

```ts
useLogger(event).set({ invoice: { id: invoice.id } })
```

## Configuration

Every setting is a `runtimeConfig` key, set from env vars:

| Env var                                                    | Meaning                                                                                  | Default                                      |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------- |
| `NUXT_DATABASE_URL`                                        | `mysql://user:password@host:3306/database`                                               | None                                         |
| `NUXT_SESSION_SECRET`                                      | Seals the session cookie. At least 32 characters.                                        | A fixed secret, in dev only                  |
| `NUXT_EMAIL_SES_SENDER`                                    | The verified SES sender. Required outside dev. Empty in dev logs mail instead.           |                                              |
| `NUXT_EMAIL_SES_REGION`                                    | The SES region                                                                           | `eu-west-1`                                  |
| `NUXT_EMAIL_ACCESS_KEY_ID`, `NUXT_EMAIL_SECRET_ACCESS_KEY` | AWS keys. Blank uses the default credential chain.                                       |                                              |
| `NUXT_OIDC_CLIENT_ID`                                      | The OAuth client id                                                                      |                                              |
| `NUXT_OIDC_CLIENT_SECRET`                                  | The OAuth client secret                                                                  |                                              |
| `NUXT_OIDC_REDIRECT_URI`                                   | The callback URL registered with the provider                                            | `/api/auth/callback` on the request's origin |
| `NUXT_PUBLIC_SIGN_IN_PROVIDER`                             | The name stored with each linked account. Picks a preset and the button's name and logo. | `google`                                     |
| `NUXT_PUBLIC_SIGN_IN_LABEL`                                | The sign-in button's label                                                               | `Continue with` and the provider's name      |
| `NUXT_OIDC_ISSUER`                                         | For a provider without a preset                                                          | The preset's                                 |
| `NUXT_OIDC_ISSUER_ALIASES`                                 | Comma-separated other spellings of the issuer in ID tokens                               | The preset's                                 |

For Google, set only the client id and secret. The provider name picks its
issuer settings from the presets in `@kmjbyrne/oidc`. Set the redirect URI
behind a proxy that changes the host.

`google` and `janus` have their own name and logo on the sign-in button and in
settings. Any other provider is named after its key, as in "Continue with Okta",
with a plain key icon. Janus has no issuer preset, since its issuer ends in the
tenant's slug: set `NUXT_OIDC_ISSUER` to `https://<janus-host>/<tenant>`.

Nothing in the code assumes Google. A different OIDC provider needs only
different values.

## The Container

`server/utils/container.ts` is the one place services are built and given their
adapters, by plain constructor injection. Nitro auto-imports its functions into
every server file:

- `useServices(event)` returns every service, acting as the request's signed-in
  user. Routes call it.
- `provideAdapters({ ... })` supplies adapters in place of the defaults. The
  sandbox supplies its JSON store and sign-in stand-in this way, from a Nitro
  plugin.
- `registerServices(factory)` adds an app's own services.
- `useAdapters()` returns the adapters in use.

The default adapters are a UUID id generator, an `OidcSignInProvider` on a real
`OidcClient` configured as above, and the MariaDB repositories when
`NUXT_DATABASE_URL` is set. With no database and nothing provided in its place,
the first service call fails with a message saying so.

### Adding an App's Services

An app registers its services from a Nitro plugin, and types them by extending
`AppServices` and `AppAdapters`:

```ts
// server/plugins/services.ts
declare module '@kmjbyrne/nuxt-shell/types' {
  interface AppAdapters {
    notes: NoteRepository
  }
  interface AppServices {
    notes: NoteService
  }
}

export default defineNitroPlugin(() => {
  registerServices(({ adapters, core }) => ({
    notes: new NoteService(adapters.notes, core.workspaceAccess)
  }))
})
```

It must be a plugin, not a file in `server/utils/`. Nitro runs every plugin at
startup, but runs a util only when something imports it. Once registered,
`useServices(event).notes` is typed in every route.

## The Database

`server/adapters/mysql/` holds the Drizzle schema for the shell's tables, and
`MysqlRepositories`, which implements core's `Repositories` on it and passes
`repositoryContract`. It works on MariaDB and MySQL. Tables and columns are
snake_case, and TypeScript fields camelCase. Emails, and identity providers and
subjects, use the `utf8mb4_bin` collation, because MariaDB's default ignores
accents and case and would match look-alike values.

Scripts outside Nuxt, such as `platform:grant`, import the adapter from
`@kmjbyrne/nuxt-shell/mysql`: `createDatabase`, `MysqlRepositories` and
`schema`.

`useDatabase()` returns the app's one Drizzle database. An app's own
repositories use it too, so they share the connection pool.

An app owns its migrations, for the shell's tables and its own together. Its
`drizzle.config.ts` lists the shell's schema next to its own:

```ts
export default defineConfig({
  dialect: 'mysql',
  schema: [
    './node_modules/@kmjbyrne/nuxt-shell/server/adapters/mysql/schema.ts',
    './server/database/schema.ts'
  ],
  out: './server/migrations',
  dbCredentials: { url: process.env.NUXT_DATABASE_URL ?? '' }
})
```

After upgrading the shell, run `drizzle-kit generate` to pick up any change to
its tables, then `drizzle-kit migrate`.

The package's own tests run the contract on a real database, using the throwaway
migrations in `test/mysql-migrations`. Regenerate them with
`pnpm db:test-generate` after changing the schema. The tests skip when
`NUXT_TEST_DATABASE_URL` is unset.

## Pages and Components

| Page                       | What it is                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `/login`                   | The sign-in button, error messages, and any `loginExtras`                              |
| `/`                        | Redirects to the last-used workspace, the only org's first workspace, or `/choose`     |
| `/choose`                  | Every org and workspace the user reaches, with their roles                             |
| `/profile`                 | The user, their sign-in providers and their orgs                                       |
| `/:org/:workspace/members` | Who the workspace is shared with, and who's invited. Owners invite, change and remove. |

### The Layout

The shell's `default` layout is the app's frame, so an app needs no layout of
its own. A full-width header holds the navigation toggle, the brand, the org and
workspace switchers, a light and dark switch, and the user menu. Under it, on
the left, a rail has a button for each of the current workspace's navigation
sections, with the panel and pin controls and the user menu at its foot. Drag
the rail's edge to size it. Wide enough, it shows labels, and pinning switches
it between narrow and wide.

Every section opens a panel, in a second rail beside the first, while it is
active. A section can name its own, a global component. Otherwise the shell's
`ShellSectionPanel` lists the section's `items`, or says there's nothing there
yet. The panel can be collapsed, and dragged to its own width, apart from the
rail's. From 768px wide (`md`) the rail and panel are a column that stays open
across navigation. Below that, on a phone, they open as a slideover from the
header, which closes on navigation.

Whether the navigation shows, whether the rail is pinned, whether the panel is
open, and both widths are kept in the `shell-nav` cookie, so the server renders
each person's layout on first paint.

Pages bring their own `UDashboardPanel` and `UDashboardNavbar`. The header
carries the sidebar toggles, so the layout turns off the navbar's own.

| Component              | What it is                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ShellHeader`          | The layout's header                                                                                                                                     |
| `ShellRail`            | The layout's rail of sections, its controls and the user menu                                                                                           |
| `ShellSectionPanel`    | The panel for a section with no `panel` of its own: its label, and its `items`                                                                          |
| `OrgSwitcher`          | The orgs the user reaches, and "All organizations"                                                                                                      |
| `WorkspaceSwitcher`    | The current org's workspaces, and "Create workspace" for org owners and admins                                                                          |
| `CreateWorkspaceModal` | A name, and a `SlugInput`                                                                                                                               |
| `SlugInput`            | Suggests a slug from the name until edited, and shows the rules and errors inline                                                                       |
| `UserMenu`             | The user, Settings, Appearance, any `userMenuItems`, Sign out, and any `userMenuExtras`. An item with `whileInside` swaps for it while inside its `to`. |

`UserMenu` takes `collapsed` for the avatar alone, and `side` and `align` to
place its menu.

Switching navigates. It never changes hidden state, so two tabs on different
orgs each act on their own.

Composables: `useMe`, `useOrgs`, `useWorkspaces(orgSlug)`, `useCurrentWorkspace`
(from the route), `useSignOut`, `useNavSections` (the sections, linked into the
current workspace, and the active one) and `useNavPrefs`.

Middleware sends signed-out visitors to `/login`, redirects old org slugs to the
current one (on the server for the first page, with a 301), and remembers the
workspace being viewed.

### Extension Points

Other layers fill these in their own `app.config.ts`. Nuxt merges the lists, so
the shell never imports those layers:

```ts
export default defineAppConfig({
  shell: {
    navSections: [
      {
        key: 'boards',
        label: 'Boards',
        icon: 'i-lucide-layout-dashboard',
        path: 'boards',
        panel: 'BoardsPanel',
        order: 10
      }
    ],
    railLinks: [
      { label: 'Feedback', icon: 'i-lucide-message-square', to: '/feedback' }
    ],
    loginExtras: ['SandboxSignInAs'],
    userMenuItems: [
      {
        label: 'Platform',
        icon: 'i-lucide-shield',
        to: '/platform',
        platformAdminOnly: true,
        whileInside: {
          label: 'Application',
          icon: 'i-lucide-layout-grid',
          to: '/'
        }
      }
    ],
    userMenuExtras: ['SandboxSwitchUser'],
    settingsTabs: [
      {
        label: 'Billing',
        icon: 'i-lucide-credit-card',
        to: '/settings/billing'
      }
    ],
    securityExtras: ['PasswordSettings']
  }
})
```

`navSections` adds sections to the rail. Each links to its `path` inside the
current workspace, `/:org/:workspace/:path`, and is active while the route is at
or under it. An empty `path` is the workspace home, active only there. `panel`
names a global component for the second rail. `items` are sub-sections, each a
`label`, an optional `icon` and a `path` inside the workspace, listed in the
second rail when there's no `panel`. An item links only once a page is at its
path, and shows as a plain row until then. It is active only at its own path.
Sections sort by `order`, lowest first, where none counts as 0, and otherwise
keep the order the layers gave. The shell adds Members, with `order: 100`. Off a
workspace page, such as Settings, the rail shows the last workspace's sections,
and none before there is one.

`railLinks` adds links at the foot of the rail, just above the user menu, for
pages that are the same from every workspace. Each is active while the route is
at or under its `to`.

`brand` sets the name and logo URL in the header and on the sign-in page, and
the sign-in page's tagline. `settingsTabs` adds tabs after Profile and Security.
`securityExtras` names global components rendered on the Security tab.
`/profile` redirects to `/settings`.

`loginExtras` and `userMenuExtras` name global components, rendered by name.

`shared/contracts/slug.ts` re-exports core's slug functions, so forms suggest
and check slugs exactly as the server does. It is the one place frontend code
reaches core, and only for pure functions.

## Testing

The route tests in `test/` build and boot the layer itself as an app, with
in-memory repositories and a fake provider supplied by a test-only Nitro plugin.
A test app inside the layer's folder can't extend it, because Nuxt skips a layer
that contains the app. `test/browser.ts` keeps cookies between requests, and can
play the provider's part in a sign-in.

## Sessions and Errors

`server/utils/session.ts` keeps two sealed cookies, using H3's session helpers.
`session` holds the signed-in user's id and session version, plus the last-used
org and workspace slugs and whose they are. A session whose version is older
than the user's counts as signed out, so moving the version on ends every
session the user has. Changing or resetting a password, linking a provider
account and signing out everywhere all move it on. Signing out keeps the
last-used workspace, and signing in keeps it only for the same user, so `/`
takes them back to it. Those decide only where `/` takes the user next time. The
URL always decides which org and workspace a request acts on. `sign-in` lives
for 10 minutes and carries one sign-in round trip's `state`, `nonce` and PKCE
verifier.

`server/middleware/actor.ts` sets `event.context.actor` from the session on
every request, through `resolveActor(event)`. Middleware from different layers
runs in no guaranteed order, so another layer's middleware that needs the actor
calls `resolveActor(event)` first. It reads the session once per request.
`SessionCurrentUser` reads it, so services know who is asking.

`server/middleware/securityHeaders.ts` sets security headers on every
response: a CSP that forbids framing and limits `base-uri`, `object-src` and
`form-action`, `X-Frame-Options: DENY`, `nosniff`, a `Referrer-Policy`, a
`Permissions-Policy`, and HSTS outside dev. A route that sets the same header
overrides it, as the media route does with `default-src 'none'`, and a page's
`referrer` meta tag still applies. The CSP has no `script-src` yet, because
Nuxt inlines scripts that would need nonces.

Every route is defined with `defineServiceHandler`, which turns the domain's
errors into responses:

| Error                                     | Status |
| ----------------------------------------- | ------ |
| `InvalidInputError` and its subclasses    | 400    |
| `NotSignedInError`                        | 401    |
| `ForbiddenError`, `EmailNotVerifiedError` | 403    |
| `NotFoundError`                           | 404    |
| `ConflictError` and its subclasses        | 409    |

The response carries the message, and the error's name in `data.error`. Apps use
the same handler for their own routes.

## Sign-In

| Route                              | What it does                                                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/auth/login`              | Keeps a new `state`, `nonce` and PKCE verifier in the `sign-in` cookie, and redirects to the provider. `?hint=` preselects an account.                                    |
| `GET /api/auth/callback`           | Checks `state` against the cookie and ends the round trip, so it can't be replayed. Completes the sign-in, signs the person in, starts the session, and redirects to `/`. |
| `POST /api/auth/logout`            | Ends the session. Answers 204.                                                                                                                                            |
| `GET /api/me`                      | The signed-in user, or 401.                                                                                                                                               |
| `POST /api/me/sign-out-everywhere` | Ends every session the user has, this one included. Answers 204.                                                                                                          |

A state that doesn't match, or a callback this browser never started, is a 400.
Other failures go back to `/login?error=` with a reason:

| Reason               | When                                                         |
| -------------------- | ------------------------------------------------------------ |
| `cancelled`          | The person cancelled at the provider                         |
| `provider`           | The provider's response failed a check. The server logs why. |
| `email-not-verified` | The provider hasn't verified the email                       |
| `identity-mismatch`  | The email is linked to a different account at this provider  |

## Orgs and Workspaces

Every route acts as the signed-in user, answers 401 to anyone signed out, and
404 for anything the user can't see. API routes accept current org slugs only.

| Route                                                            | What it does                                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `GET /api/orgs`                                                  | The orgs the user reaches, with roles and visible workspaces                          |
| `GET /api/orgs/:org`                                             | One of them                                                                           |
| `GET /api/orgs/:oldSlug/resolve`                                 | `{ slug }`: the current slug, so old links can redirect                               |
| `GET /api/orgs/:org/workspaces`                                  | The org's workspaces the user sees                                                    |
| `POST /api/orgs/:org/workspaces`                                 | `{ name, slug? }`. Org owners and admins only.                                        |
| `GET /api/orgs/:org/workspaces/:workspace/members`               | The workspace's members, and invitations waiting                                      |
| `POST /api/orgs/:org/workspaces/:workspace/invitations`          | `{ email, role }`: invites. The same answer for every email. Owners only, 50 an hour. |
| `DELETE /api/orgs/:org/workspaces/:workspace/invitations/:email` | Withdraws an invitation. Owners only.                                                 |
| `PATCH /api/orgs/:org/workspaces/:workspace/members/:userId`     | `{ role }`. Owners only.                                                              |
| `DELETE /api/orgs/:org/workspaces/:workspace/members/:userId`    | Owners remove anyone. A member removes themselves to leave.                           |
| `PUT /api/me/last-workspace`                                     | `{ org, workspace }`: remembers it, for where `/` goes                                |
| `GET /api/me/home`                                               | `{ path }`: the last-used workspace, the only org's first workspace, or `/choose`     |

The old-slug route sits under the org (`/api/orgs/:oldSlug/resolve`) rather than
at `/api/orgs/resolve/:slug`. An org slugged `resolve` would otherwise clash
with `/api/orgs/:org/workspaces`.

Request and response shapes are Zod schemas in `shared/contracts/`. Entities
never leave the server as they are: routes map them with the helpers in
`server/utils/responses.ts`.

### Feature Flags

A layer declares its feature's flag under `shell.features` in its app config:

```ts
export default defineAppConfig({
  shell: {
    features: {
      progressBoard: {
        label: 'Progress board',
        description: 'Drag-and-drop matrix of work'
      }
    }
  }
})
```

The merged names are the catalog core checks against. Every flag is off until a
platform admin switches it on for an org. The org responses carry the org's
`features`, and `useFeature('progressBoard')` says whether the current org has
it, for showing a page or nav entry. The feature's services check again with
`features.require`, so hiding is never the only guard. Flags live in the
`org_features` table.

## Adapters

| Adapter              | Implements       | What it does                                                     |
| -------------------- | ---------------- | ---------------------------------------------------------------- |
| `OidcSignInProvider` | `SignInProvider` | Wraps any `OidcClientLike`, names the provider, parses the email |
| `SessionCurrentUser` | `CurrentUser`    | Reads the user from `event.context.actor`                        |
| `UuidIdGenerator`    | `IdGenerator`    | Random UUIDs                                                     |
