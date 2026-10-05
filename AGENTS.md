# Working in This Repository

This is the foundation repository: shared packages for SaaS apps, and a
reference app built on them. Read `ARCHITECTURE.md` for how it fits together,
and `DEVELOPMENT.md` for running it.

## Where Code Goes

If it's the same in every app, and a bug fix to it should reach every app at
once, it goes in a package. Anything specific to one app stays out of
`packages/`. The reference app at the root is only a model for apps, so it holds
no features of its own beyond the workspace home page.

| Change                                            | Where                                         |
| ------------------------------------------------- | --------------------------------------------- |
| A domain rule, entity, value or service           | `packages/core/src`                           |
| A port's production adapter, a route, the session | `packages/nuxt-shell/server`                  |
| A page or component every app uses                | `packages/nuxt-shell/app`                     |
| A request or response shape                       | `packages/*/shared/contracts`, as Zod schemas |
| Platform admin pages and routes                   | `packages/nuxt-platform`                      |
| Dev data, the sign-in stand-in, dev tools         | `packages/sandbox`                            |
| The reference app's layout and pages              | `app/`                                        |
| The reference app's dev wiring                    | `sandbox/`                                    |

## Rules

- **Dependencies point one way.** `core`, `oidc` and `json-store` import none of
  the other packages, and nothing from Nuxt. The shell never imports the
  platform or the sandbox. Production code never imports the sandbox or
  `json-store`. Use packages through their public entry points only, as listed
  in each `package.json`'s `exports`. ESLint enforces all of this. Don't disable
  the rule to get around it.
- **Core is plain TypeScript.** No Nuxt, H3, Zod or storage imports in its main
  entry. Rules live on entities and in services, never in routes.
- **Routes are thin.** Each validates its input with a contract, calls one
  service method, and maps the result to a contract. Never return an entity as
  it is. Define routes with `defineServiceHandler`, so domain errors become the
  right status.
- **Frontend code imports contracts,** never core or server code. The one
  exception is `shared/contracts/slug.ts`, which re-exports core's pure slug
  functions so forms check slugs as the server does.
- **Platform roles, org roles and workspace roles stay separate,** in the
  domain, the API and the UI.
- **Check permissions, never roles.** Services ask `workspaceAccess.require` for
  a permission, and pages check the `permissions` in responses. What each role
  may do lives in `packages/core/src/entities/permissions.ts` alone.
- **Anything a user can't see is not found,** never forbidden, so its existence
  isn't revealed.
- **The URL decides which org and workspace a request acts on,** never the
  session.
- **Storage changes come with a migration.** Change
  `packages/nuxt-shell/server/adapters/mysql/schema.ts`, then run
  `pnpm db:generate` for the app and
  `pnpm --filter @kmjbyrne/nuxt-shell db:test-generate` for the package's tests.

## Tests

Tests sit beside the code, as `*.test.ts`.

- **Core's services:** use `createTestServices()` from `@kmjbyrne/core/testing`.
  Cover every rule.
- **A new implementation of `Repositories`** must pass `repositoryContract` from
  `@kmjbyrne/core/contract`.
- **A new `JsonStore`** must pass `jsonStoreContract` from
  `@kmjbyrne/json-store/contract`.
- **Routes:** go in the package's `test/`, booted with `setupApp` from
  `@kmjbyrne/nuxt-shell/testing`. Cover signed in, signed out (401), outsiders
  (404) and missing permissions (403). Registration is closed, so create users
  with `createUser` before signing them in.

## Every Change

- **Lint, typecheck, test and build pass at every commit.** Run `pnpm lint`,
  `pnpm typecheck`, `pnpm test` and `pnpm build`. Run `pnpm check:bundle` when a
  change could pull dev or platform code into the app.
- **Add an entry to `CHANGELOG.md`** under `Unreleased`, in the
  [Keep a Changelog](https://keepachangelog.com) format. It covers the packages,
  the app, the sandbox, the docs and the tooling.
- **Update the package's README** when its public API or behaviour changes.
- **Commit messages** use Conventional Commits, scoped by package or area:
  `feat(core): ...`, `fix(nuxt-shell): ...`, `docs: ...`.
- **Shared dependency versions** live in the pnpm catalog in
  `pnpm-workspace.yaml`. A library the app also uses is a peer dependency of the
  package, so only one copy is ever installed.

## Running a Second Dev Server

Two dev servers writing the same build folder break each other. To run one
beside a developer's own, give it its own folder and port:

```bash
NUXT_BUILD_DIR=.nuxt-agent pnpm exec nuxt dev sandbox --dotenv ../.env --port 3460
```

Stop it by its port when done, so it doesn't linger.
