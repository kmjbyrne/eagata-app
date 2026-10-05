<!-- Keep a Changelog repeats section names under each version. -->
<!-- markdownlint-disable MD024 -->

# Changelog

Every notable change to this repository: the packages, the reference app, the
sandbox, the docs and the tooling. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Fixed

- `@varcharley/editor`: a compact editor, such as a feedback reply, no longer
  shows the block drag handle, which overflowed its box. Its padding is tighter
  to match, and the reply box no longer clips the `/` command menu.
- The org and workspace switchers navigate again. Their items were checkbox
  items, which Nuxt UI renders without a link.
- The sidebar keeps its navigation on pages outside a workspace, such as
  Settings, by falling back to the last workspace visited.
- Buttons in settings and platform cards no longer stretch to full width on wide
  screens.
- `@kmjbyrne/nuxt-shell`: a refreshed, replayed or stale sign-in callback
  redirects, to `/` when signed in and to `/login` with "This sign-in expired"
  otherwise, instead of answering 400. Its log line leaves out the provider's
  code and state.

### Added

- The reference app: feedback at the foot of the sidebar, the inbox with the
  platform, migrations `0005` and `0006`, and the editor demo uploading real
  images.
- `@kmjbyrne/sandbox`: `feedbackCollections` and `JsonFeedbackRepository`.
- `@kmjbyrne/nuxt-feedback`: feedback at `/feedback`, each person's own from
  anywhere in the app, with rich text and images, and the platform inbox in the
  `@kmjbyrne/nuxt-feedback/platform` sub-layer. MariaDB tables `feedback` and
  `feedback_replies`.
- `@kmjbyrne/nuxt-media`: `useMediaUpload()`, the editor's `upload` for any
  page.
- `@kmjbyrne/nuxt-platform`: `navItems`, links other layers add to the platform
  sidebar.
- Tooling: installing prepares every layer, so tests and type checks never
  depend on a route test having built one first.
- `@kmjbyrne/core/feedback`: feedback from people to the platform, as in
  basecamp-app, owned by its author rather than a workspace. People see and
  answer only their own, and platform admins answer everyone's and set the
  status. `MediaService.store` lets such a service store an image once it has
  checked access itself.
- `@kmjbyrne/nuxt-media`: image uploads per workspace, on local disk under
  `NUXT_MEDIA_DIR` (`./instance/media` by default), served at `/media/...` to
  the workspace's people and platform admins only, cached privately.
- `@kmjbyrne/core/media`: images uploaded per workspace or as a person's own,
  typed by their bytes, and readable only by the workspace's people, or that
  person, and platform admins. A `media.upload` permission, held by every
  workspace role.
- Inside the platform area, the user menu's Platform item becomes Application,
  back to the app, through a menu item's `whileInside`.
- Self-service deactivation: `UserService.deactivateMe`, confirmed by typing the
  user's own email, `POST /api/me/deactivate`, and an Account section with a
  confirmation dialog on Settings, Security. Only a platform admin can
  reactivate, and the last active platform admin can't deactivate themselves.
- The reference app: passwords, with migration `0004`, and the sandbox password
  `sandbox-password` for Ada and Grace. `NUXT_APP_URL` and `NUXT_TRUST_PROXY` in
  `.env.example`.
- `@kmjbyrne/sandbox`: `passwordCollections` and `JsonPasswordRepository`, for
  apps with passwords.
- `@kmjbyrne/nuxt-passwords`: the optional passwords layer. An email and
  password form on the sign-in page, `/link-account` to confirm the password
  before linking Google, forgot and reset pages, a Password section on Settings,
  Security, and "Email a set-password link" for platform admins. Werkzeug's
  pbkdf2 hash format, and MariaDB tables `user_credentials` and
  `password_reset_tokens`.
- `@kmjbyrne/nuxt-shell`: `publicPaths` for pages signed-out visitors may open,
  and a provider sign-in that needs proof now waits at `/link-account` instead
  of failing. `setupApp` takes a layer's own test plugins and endpoints.
- `@kmjbyrne/nuxt-platform`: `userExtras`, components on a user's platform page.
- Tooling: MariaDB tests run one file at a time, in their own vitest project.
- `@kmjbyrne/core/passwords`: optional passwords. `PasswordService` signs in,
  links a provider account once the password confirms it, sets and changes
  passwords, and sends reset and invite links. Rate limited per account and per
  email address.

- `@kmjbyrne/nuxt-shell`: request logging with evlog. Every `/api` request
  writes one wide event: method, path, status, duration, request id, the
  signed-in user's id, and any error. Expected refusals, such as 401 and 404,
  log as warnings. Passwords, tokens and OAuth codes are redacted. Apps name
  themselves with `evlog.env.service`, and add fields with
  `useLogger(event).set(...)`.

- `@kmjbyrne/core`: `AuthService.connectIdentity` links a provider account to
  the signed-in user. A `LinkProof` port lets sign-in ask for proof, such as a
  password, before linking a provider account to an existing user: `signIn` then
  returns `link-required` instead of linking.

### Changed

- `@kmjbyrne/nuxt-shell`: a new sign-in page: the app's logo, name and tagline
  over one sign-in button, from `shell.brand` in `app.config`. The sandbox lists
  its people under "or sign in as a test persona".
- The reference app: the Eagata logo and favicon.
- `@kmjbyrne/nuxt-shell`: the database refuses a role core doesn't know, through
  CHECK constraints on `org_memberships`, `workspace_memberships` and
  `platform_roles`, built from core's role lists. Migration `0003`.
- `@kmjbyrne/core`: named permissions. `workspacePermissions` and
  `orgPermissions` map each permission to the least role holding it, and apps
  extend them with their own. `WorkspaceAccess.require` takes a permission in
  place of a role, and `canManageWorkspaces` is gone. Org and workspace
  responses carry `permissions`, and pages check those instead of roles.
- `@kmjbyrne/core`: the platform role is a grant, `User.platformRole`
  (`{ role, grantedAt, grantedBy }` or null), in place of the `isPlatformAdmin`
  flag. Repositories save it with `setPlatformRole`. The platform user page
  shows who granted it and when. The API still answers `isPlatformAdmin`.
- `@kmjbyrne/nuxt-shell`: platform roles move to a `platform_roles` table, and
  `users.is_platform_admin` is dropped. The migration copies existing admins
  across, dated from their account's creation. Dev data saved before this needs
  a Reset.
- `@kmjbyrne/nuxt-shell`: the provider name moved to public config, as
  `NUXT_PUBLIC_SIGN_IN_PROVIDER` in place of `NUXT_OIDC_PROVIDER`, so pages can
  show its logo.

## 0.1.0 - 2026-10-05

The first release of the foundation: shared packages for users, organizations,
workspaces, sign-in and a platform admin area, and a reference app built on
them.

### Added

#### `@kmjbyrne/core`

- The domain: `User`, `Org`, `Workspace`, org memberships and workspace
  memberships, with branded ids and the `Email`, `Name` and `Slug` values.
- Personal orgs, created with every user, and company orgs, created by platform
  admins.
- Three kinds of role: the platform role on users, `owner`, `admin` and `member`
  on org memberships, and `owner`, `editor` and `viewer` on workspace
  memberships. Org owners and admins act as owners of every workspace in their
  org.
- Slugs of 3 to 32 characters, suggested from names, with reserved org slugs. A
  changed org slug keeps redirecting, and is never given to another org.
- Sign-in with closed registration: a provider account links to the user a
  platform admin set up with that verified email, and anyone else is refused.
- Deactivated users: they can't sign in, and their sessions stop working in
  every service, but nothing of theirs is removed.
- Services for the signed-in user, orgs, workspaces, sharing a workspace by
  email, and `WorkspaceAccess`, the one access check every app uses.
- Platform services for company orgs, org members, users, the platform role and
  deactivation, each refusing anyone but a platform admin.
- `bootstrapPlatformAdmin`, for the first platform admin of a fresh install.
- The rules: an org and a workspace always keep an owner, the platform keeps an
  active platform admin, and anything a user can't see is not found.
- Ports for storage, ids, the current user and sign-in, an in-memory store,
  `createTestServices`, and `repositoryContract` in `@kmjbyrne/core/contract`
  for every storage adapter to pass.

#### `@kmjbyrne/oidc`

- The OpenID Connect authorization code flow with PKCE, for any provider, with
  Google as a preset.
- Checks on the discovery issuer, `iss`, `aud`, `azp`, `exp` and the nonce, and
  timeouts on discovery and token requests.
- A login hint, a redirect URI per sign-in, and the `name` claim.

#### `@kmjbyrne/json-store`

- Collections of JSON documents with Zod schemas and transactions, in memory or
  in one file.
- Seeding of empty collections, drift reported instead of thrown, and `reset()`.
- `jsonStoreContract` in `@kmjbyrne/json-store/contract`, for every store to
  pass.

#### `@kmjbyrne/nuxt-shell`

- The layer every app extends: the service container with `provideAdapters` and
  `registerServices`, sealed cookie sessions, and `defineServiceHandler`, which
  maps domain errors to HTTP statuses.
- MariaDB and MySQL repositories on Drizzle, used when `NUXT_DATABASE_URL` is
  set, and `useDatabase()` for apps.
- Sign-in routes. Google needs only a client id and secret: the issuer comes
  from the provider's preset, and the redirect URI from the request.
- Routes for orgs, workspaces, workspace members, old org slugs, the last-used
  workspace, and where `/` goes.
- Pages for `/login`, `/`, `/choose`, `/profile` and each workspace's Members,
  and the `OrgSwitcher`, `WorkspaceSwitcher`, `CreateWorkspaceModal`,
  `SlugInput` and `UserMenu` components, with an Appearance setting.
- Extension points in `app.config`, so other layers add to the login page and
  the user menu without the shell importing them.
- Public entry points for its types, contracts, adapters, MariaDB adapter and
  route-test helpers.

#### `@kmjbyrne/nuxt-platform`

- The platform admin area at `/platform`, built in when `NUXT_PLATFORM=true`:
  organizations, their members and slugs, and users, with switches for the
  platform role and deactivation.
- Access checked by its middleware and again by the platform services.

#### `@kmjbyrne/sandbox`

- The dev-only layer: dev data in `.data/store.json`, default fixtures that
  exercise every rule, a stand-in for the sign-in provider with its own consent
  screen, and "Sign in as", "Switch user" and the store status with Reset.
- A guard that refuses to start outside a dev server.

#### `@varcharley/editor`

- The rich-text editor layer, built on Tiptap through Nuxt UI, with Word import
  and image editing, and a `toolbar` prop to hide the fixed toolbar.

#### The Reference App and Sandbox

- The dashboard layout, the workspace home page, and an Editor demo page.
- A charcoal and mint theme, dark by default.
- `sandbox/`, so `pnpm dev` runs the app with no setup beyond `pnpm install`.
  `NUXT_DATA_STORE` and `NUXT_SIGN_IN` switch it between the dev data and the
  database, and between the dev sign-in and real Google.
- `pnpm platform:grant <email> [name]`, which creates the first platform admin.
- A first migration, and `db:generate` and `db:migrate`.
- A `Dockerfile` with an `app` image and a `tools` image, so migrations run as
  their own explicit step.

#### Tooling

- A pnpm workspace with a catalog for shared dependency versions, peer
  dependencies so only one copy of each is installed, and packages published to
  npm with restricted access.
- ESLint rules for the dependency directions, the public entry points, and
  contract-only frontend code.
- `pnpm check:bundle`, which fails if sandbox code, or platform code when it's
  off, reaches a production build.
- CI running lint, typecheck, tests, the build and `check:bundle`.

#### Docs

- `ARCHITECTURE.md`, `DEVELOPMENT.md` and `AGENTS.md`, and a README for every
  package.

## 0.0.0 - 2026-10-05

### Added

- The Nuxt UI starter, on Node 24.
