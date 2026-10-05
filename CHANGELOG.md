<!-- Keep a Changelog repeats section names under each version. -->
<!-- markdownlint-disable MD024 -->

# Changelog

Every notable change to this repository: the packages, the reference app, the
sandbox, the docs and the tooling. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- `@kmjbyrne/core`: `AuthService.connectIdentity` links a provider account to
  the signed-in user. A `LinkProof` port lets sign-in ask for proof, such as a
  password, before linking a provider account to an existing user: `signIn` then
  returns `link-required` instead of linking.

### Changed

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
