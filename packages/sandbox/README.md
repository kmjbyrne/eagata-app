# @kmjbyrne/sandbox

A Nuxt layer for local development. It keeps the app's data in a JSON file,
stands in for the sign-in provider, and adds dev tools such as "Sign in as". It
lets an app run with no database and no OAuth client.

It is never part of a production build. An app extends it only from its
`sandbox/` wrapper, which `pnpm dev` runs, and never from the app itself. It
refuses to start outside a dev server, because its sign-in stand-in lets anyone
in as anyone.

## Install

The package is published to npm with restricted access, so installing it needs
an npm login with access to the `@kmjbyrne` scope. Install it in the app's
`sandbox/` package, not in the app:

```bash
npm login
pnpm --filter sandbox add -D @kmjbyrne/sandbox
```

Then extend it in `sandbox/nuxt.config.ts`, after the app.

## Setting Up

A Nitro plugin in the app's `sandbox/server/plugins/` calls `defineSandbox`
once:

```ts
export default defineNitroPlugin(() => {
  const sandbox = defineSandbox({
    collections,
    devUsers: async (store) =>
      (await store.find('users')).map((user) => ({
        id: user.id,
        email: user.email,
        name: user.displayName
      }))
  })
})
```

| Option        | Meaning                                                                          |
| ------------- | -------------------------------------------------------------------------------- |
| `collections` | The JSON store's collections, from `defineCollections` in `@kmjbyrne/json-store` |
| `devUsers`    | Reads the people "Sign in as" offers from the store, each time it's asked        |
| `file`        | Where the data lives. Defaults to `.data/store.json`.                            |

The store is a `FileJsonStore`. It reads and seeds the file on first use, so
plugin order doesn't matter. `useSandbox()` returns what `defineSandbox` set up,
for the sandbox's own routes.

## Components

Nuxt UI components, for the app's sandbox to place through the shell's extension
points. Nuxt prefixes them with their folder:

| Component            | What it is                                                    |
| -------------------- | ------------------------------------------------------------- |
| `SandboxSignInAs`    | A card listing the dev users. Choosing one signs in as them.  |
| `SandboxSwitchUser`  | A "Switch user" menu, for the user menu                       |
| `SandboxStoreStatus` | When the data was seeded, a drift warning, and a reset button |

Signing in as someone signs out, then runs the real sign-in with them as the
login hint. The stand-in signs a hinted dev user straight in.
`useSandboxUsers()` does this for any other control.

## Endpoints

| Route                      | What it does                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| `GET /api/_sandbox/users`  | The people "Sign in as" offers                                                                            |
| `GET /api/_sandbox/status` | `{ seededAt, drifted }`: when the store was seeded, and any collections that no longer match their schema |
| `POST /api/_sandbox/reset` | Puts every collection back to its fixtures                                                                |

Every sandbox route answers 404 outside a dev server, as a second guard behind
the startup check.

## Tenancy on the JSON Store

`@kmjbyrne/sandbox/json-store` stores core's tenancy data in the sandbox's JSON
file:

- `tenancyCollections(fixtures?)` defines the `users`, `orgs`, `workspaces`,
  `memberships` and `workspaceMembers` collections, seeded from fixtures.
  Combine them with an app's own collections using `combineCollections`.
- `JsonStoreRepositories` implements core's `Repositories` on the store, and
  passes `repositoryContract`. Supply it with `provideAdapters`.
- `defaultTenancyFixtures()` is a small world that exercises every rule. An app
  can use it, add to it, or replace it.
- `tenancyDevUsers(store)` lists everyone with their company roles, for "Sign in
  as".

The default fixtures, all with `@example.com` emails:

| Person            | Who they are                                            |
| ----------------- | ------------------------------------------------------- |
| Pat Platform      | Platform admin, in no company                           |
| Ada Lovelace      | Owner of Acme. Shares her personal workspace with Mary. |
| Grace Hopper      | Admin of Acme, not its owner. Plain member of Globex.   |
| Alan Turing       | Plain member of Acme, who sees only Finance             |
| Katherine Johnson | Owner of Globex                                         |
| Mary Somerville   | Only her personal org, plus Ada's shared workspace      |

Acme (`acme`, once `acme-old`) has General and Finance. Globex (`globex`) has
General and Research. Everyone has a personal org with a General workspace.
Nobody has signed in yet, so the first sign-in links each account.

Every user now has a personal org, so the brief's "user with no orgs" can't
exist. Mary reaches two orgs, so she lands on `/choose`.

## The Sign-In Stand-In

`FakeOidcClient` (from `@kmjbyrne/sandbox/oidc`) has the same shape as the real
`OidcClient`, so the app's sign-in routes work unchanged. Wrap it in the shell's
`OidcSignInProvider` and supply it with `provideAdapters`.

Its authorization URL is the consent screen at `/_sandbox/oidc/authorize`. It
lists the dev users, plus a form for any email, with a "verified" checkbox to
try unverified emails. Choosing sends the person back to the app's real
callback, with a code that `complete()` turns into an identity. Dev sign-in
therefore runs through the app's real sign-in flow.

- The same email always gets the same subject, so a second sign-in finds the
  account the first one linked.
- A login hint that names a dev user signs them straight in. That is how "Sign
  in as" works in one click.
- It only sends people back to the app's own origin.
