<!-- Keep a Changelog repeats section names under each version. -->
<!-- markdownlint-disable MD024 -->

# Changelog

Every notable change to this repository: the packages, the reference app, the
sandbox, the docs and the tooling. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- pnpm workspace for `packages/*` and `sandbox`.
- Shared TypeScript config for the plain TypeScript packages, Vitest, and CI
  that runs lint, typecheck, tests and the build.
- `@kmjbyrne/oidc`: OpenID Connect sign-in with PKCE, for any provider.
- `@kmjbyrne/oidc` rejects a discovery document whose `issuer` differs from the
  configured issuer.
- `@kmjbyrne/oidc` requires `azp` to equal the client id when an ID token has
  several audiences or names an `azp`.
- `@kmjbyrne/oidc` times out discovery and token requests, after 10 seconds by
  default.
- `@kmjbyrne/oidc` accepts a `loginHint` that preselects an account.
- `@kmjbyrne/oidc` returns the `name` claim.
- `@kmjbyrne/oidc`: `OIDC_PRESETS` with Google's issuer settings, and a redirect
  URI that can be given per sign-in.
- `@kmjbyrne/json-store`: collections of JSON documents with Zod schemas and
  transactions, in memory or in one JSON file, with a contract suite every store
  must pass.
- `@kmjbyrne/core`: errors, branded ids, `Email`, `Name` and the `User` entity.
- `@kmjbyrne/nuxt-shell`: the Nuxt layer every app extends, starting with the
  service container, `provideAdapters`, `registerServices`, and the OIDC,
  session and id adapters. The reference app extends it.
- Packages publish to npm with restricted access, so installing them needs an
  npm login.

### Removed

- The Nuxt UI starter's demo content.

## 0.0.0 - 2026-10-05

### Added

- The Nuxt UI starter, on Node 24.
