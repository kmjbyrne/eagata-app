# Development

The app runs locally with no database and no OAuth client. Its data lives in a
JSON file seeded from fixtures, and sign-in goes through a stand-in for the
provider. This is the default for any fresh checkout or worktree. All of it
lives in `sandbox/`, a Nuxt app that extends the reference app and the sandbox
layer, and is never built for production.

## Start the App

Use Node 24, then install and start:

```bash
pnpm install
pnpm dev
```

The first run prints `Created .env from .env.mock`. `scripts/ensure-env` copies
the committed `.env.mock` whenever there is no `.env`, so there is nothing to
fill in. Open the `Local:` URL from the output.

`NUXT_PLATFORM` is read when the app starts. Restart `pnpm dev` after changing
it.

## Sign In

`/login` has two ways in. **Continue with Google** opens the sandbox's dev
sign-in form, which stands in for the provider: enter an email, an optional
name, and whether the provider has verified it. **Sign in as** lists everyone in
the dev data, and signs in as them in one click. Both go through the app's real
sign-in routes.

Registration is closed, so only people in the dev data, or users a platform
admin creates, can sign in. Any other email is refused as not invited. Untick
"verified" to see an unverified email refused.

## What the Fixtures Hold

| Person            | Who they are                                              |
| ----------------- | --------------------------------------------------------- |
| Pat Platform      | Platform admin, in no company                             |
| Ada Lovelace      | Owner of Acme. Shares her personal workspace with Mary.   |
| Grace Hopper      | Admin of Acme, not its owner. Plain member of Globex.     |
| Alan Turing       | Plain member of Acme, who sees only Finance               |
| Katherine Johnson | Owner of Globex                                           |
| Mary Somerville   | Only her personal org, plus Ada's shared workspace        |
| Dana Deactivated  | Deactivated member of Acme. Signing in as her is refused. |

Every email is `<first name>@example.com`. Acme (`acme`, once `acme-old`) has
General and Finance, and Globex (`globex`) has General and Research. Everyone
has a personal org with a General workspace. Old links such as
`/acme-old/finance` redirect.

The defaults live in `packages/sandbox/server/json-store/fixtures.ts`. The
reference app uses them as they are. An app adds to them, or replaces them, in
its `sandbox/server/plugins/sandbox.ts`.

## How Changes Persist

Changes save to `.data/store.json`, and survive restarts. Each worktree has its
own. **Reset**, on the login page, puts every collection back to its fixtures.

The store seeds a collection only when it is missing or empty, so a change to
the fixtures doesn't reach an existing file by itself: press Reset, or delete
the file. If a change to a schema makes stored data invalid, the store sets that
collection aside and the login page offers the reset.

## The Platform Area

`.env.mock` sets `NUXT_PLATFORM=true`, so the platform area is built in. Sign in
as Pat Platform, then choose **Platform** in the user menu, or open `/platform`.
There you can create users and company orgs, manage org members and roles,
change an org's slug, grant the platform role, and deactivate users. Anyone else
gets no Platform item, and `/platform` sends them home.

## Use the Real Database

`.env.example` lists every setting. To run the sandbox against MariaDB, set
`NUXT_DATA_STORE=mysql` and `NUXT_DATABASE_URL` in `.env`, apply the migrations,
and create a platform admin:

```bash
pnpm db:migrate
pnpm platform:grant you@example.com "Your Name"
```

The sign-in stand-in stays on until you set a real OIDC client
(`NUXT_OIDC_CLIENT_ID` and `NUXT_OIDC_CLIENT_SECRET`). After changing the
shell's schema, or an app's own tables, generate a migration with
`pnpm db:generate`.

## How the Sandbox Works

`sandbox/nuxt.config.ts` extends the reference app and `@kmjbyrne/sandbox`, so
the sandbox runs the whole app and adds to it. Its Nitro plugin sets up the JSON
store and hands the app's container the JSON repositories and the sign-in
stand-in, with `provideAdapters`. Without that plugin the app runs on MariaDB
and the real provider, which is what production does. Its `app.config.ts` fills
the shell's extension points with "Sign in as", the store status and "Switch
user".

Nuxt resolves `~` and `~~` against the app it is running, which would point the
app's own imports into `sandbox/`. The sandbox config maps both back to the
root.

Dependencies only point one way: the sandbox uses the app, never the reverse.
`pnpm check:bundle` proves it by building the app as production does and failing
if any sandbox code is in the output. The sandbox also refuses to start outside
a dev server, because its sign-in stand-in lets anyone in as anyone.

## Checks

| Command             | What it does                                                           |
| ------------------- | ---------------------------------------------------------------------- |
| `pnpm lint`         | ESLint, including the dependency rules between packages                |
| `pnpm typecheck`    | Every package, the app, the sandbox, and the scripts                   |
| `pnpm test`         | Unit, contract and route tests                                         |
| `pnpm build`        | The production build, without the platform unless `NUXT_PLATFORM=true` |
| `pnpm check:bundle` | Builds with and without the platform, and fails on leaked dev code     |

The MariaDB contract tests run only when `NUXT_TEST_DATABASE_URL` is set, and
use that database, never the main one. Route tests build and boot a Nuxt server,
so `pnpm test` takes a minute or so.

To run a second dev server beside your own, for an agent or a test, give it its
own build folder and port, or the two will break each other's files:

```bash
NUXT_BUILD_DIR=.nuxt-agent pnpm exec nuxt dev sandbox --dotenv ../.env --port 3460
```

## Docker

The `Dockerfile` builds two images. No secrets enter either: settings come from
`NUXT_*` variables when a container runs.

```bash
docker build --target app -t eagata-app .
docker build --target app --build-arg NUXT_PLATFORM=true -t eagata-app .
docker build --target tools -t eagata-tools .
```

`app` is the production server, about 245 MB. `NUXT_PLATFORM` is a build
argument, off by default, so an image built without it ships none of the
platform's code.

`tools` runs deliberate, one-off operations against the database. It does
nothing unless given a command, so nothing migrates by accident. Run migrations
as their own step, before starting a new `app`:

```bash
docker run --rm -e NUXT_DATABASE_URL=... eagata-tools drizzle-kit migrate
docker run --rm -e NUXT_DATABASE_URL=... eagata-tools tsx scripts/platform-grant.ts you@example.com "Your Name"
```

The `app` container needs `NUXT_DATABASE_URL`, `NUXT_SESSION_SECRET`, and the
OIDC client settings.
