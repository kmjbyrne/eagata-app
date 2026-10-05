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

`drizzle-orm` and `mysql2` are peer dependencies. The app installs them, so it
and the shell share one copy. Two copies of `drizzle-orm` don't recognise each
other's tables.

Inside this repository, depend on it from the workspace instead. Then extend it
in the app's `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  extends: ['@kmjbyrne/nuxt-shell']
})
```

## Configuration

Every setting is a `runtimeConfig` key, set from env vars:

| Env var                    | Meaning                                                    | Default                       |
| -------------------------- | ---------------------------------------------------------- | ----------------------------- |
| `NUXT_SESSION_SECRET`      | Seals the session cookie. At least 32 characters.          | A fixed secret, in dev only   |
| `NUXT_OIDC_PROVIDER`       | The name stored with each linked account                   | `google`                      |
| `NUXT_OIDC_ISSUER`         | The OIDC issuer                                            | `https://accounts.google.com` |
| `NUXT_OIDC_ISSUER_ALIASES` | Comma-separated other spellings of the issuer in ID tokens | `accounts.google.com`         |
| `NUXT_OIDC_CLIENT_ID`      | The OAuth client id                                        |                               |
| `NUXT_OIDC_CLIENT_SECRET`  | The OAuth client secret                                    |                               |
| `NUXT_OIDC_REDIRECT_URI`   | The app's callback URL                                     |                               |

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
snake_case, and TypeScript fields camelCase.

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

## Sessions and Errors

`server/utils/session.ts` keeps two sealed cookies, using H3's session helpers.
`session` holds the signed-in user's id, plus the last-used org and workspace
slugs. Those decide only where `/` takes the user next time. The URL always
decides which org and workspace a request acts on. `sign-in` lives for 10
minutes and carries one sign-in round trip's `state`, `nonce` and PKCE verifier.

`server/middleware/actor.ts` sets `event.context.actor` from the session on
every request. `SessionCurrentUser` reads it, so services know who is asking.

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

## Adapters

| Adapter              | Implements       | What it does                                                     |
| -------------------- | ---------------- | ---------------------------------------------------------------- |
| `OidcSignInProvider` | `SignInProvider` | Wraps any `OidcClientLike`, names the provider, parses the email |
| `SessionCurrentUser` | `CurrentUser`    | Reads the user from `event.context.actor`                        |
| `UuidIdGenerator`    | `IdGenerator`    | Random UUIDs                                                     |
