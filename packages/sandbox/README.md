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
