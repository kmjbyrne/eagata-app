# @kmjbyrne/nuxt-passwords

Optional passwords, beside the sign-in provider. An app extends this layer to
have them, and removes it to have none: nothing else in the app changes.

```ts
export default defineNuxtConfig({
  extends: ['@kmjbyrne/nuxt-shell', '@kmjbyrne/nuxt-passwords']
})
```

The rules live in `@kmjbyrne/core/passwords`. This layer stores, hashes and
serves them.

## What It Adds

- **Sign-in:** an email and password form under the provider button, through the
  shell's `loginExtras`.
- **Linking:** when someone signs in with Google for the first time and the
  matched account has a password, `/link-account` asks for it once before
  linking. Accounts without a password link on the verified email, as before.
- **Resets:** `/forgot-password` emails a single-use link to `/reset-password`,
  valid for 30 minutes. It also lets someone who only signs in with Google set a
  password.
- **Settings:** a Password section on Settings, Security, through the shell's
  `securityExtras`, to set a first password or change one.
- **Invites:** "Email a set-password link" on a user's platform page, through
  the platform's `userExtras`, with a link valid for 72 hours.

## Hashing

`WerkzeugPasswordHasher` reads and writes Werkzeug's `generate_password_hash`
pbkdf2 format, `pbkdf2:sha256:<iterations>$<salt>$<hex>`, so hashes from a
Python app verify as they are. New hashes use 600,000 iterations.

## Storage

Two tables, apart from `users`, so an app without passwords has neither:
`user_credentials` and `password_reset_tokens`, which keeps only a SHA-256 of
each token. List the schema in the app's `drizzle.config.ts`, then run
`pnpm db:generate`:

```ts
schema: [
  './node_modules/@kmjbyrne/nuxt-shell/server/adapters/mysql/schema.ts',
  './node_modules/@kmjbyrne/nuxt-passwords/server/adapters/mysql/schema.ts'
]
```

The store defaults to MariaDB on `NUXT_DATABASE_URL`. The sandbox supplies its
own as the `passwordRepository` adapter.

## Settings

| Setting            | What it does                                                                        |
| ------------------ | ----------------------------------------------------------------------------------- |
| `NUXT_APP_URL`     | Where emailed links point, such as `https://app.example.com`. Required outside dev. |
| `NUXT_TRUST_PROXY` | `true` behind one proxy, so per-address limits read `X-Forwarded-For`. See below.   |

Mail goes through the shell's email sender: AWS SES when `NUXT_EMAIL_SES_SENDER`
is set. Without it, dev prints mail to the log, and anywhere else the shell
fails with an error naming the setting.

## Limits

Five password checks per account in 15 minutes, counted from the last right
one, 20 sign-in attempts per address in 15 minutes, three reset emails per
address an hour, and ten reset requests per client address an hour.

An attempt counts before its password is checked, so attempts sent at the same
moment can't all slip under the limit while the hash checks run.

With `NUXT_TRUST_PROXY=true`, the client's address is the last
`X-Forwarded-For` entry, the one the proxy appended. Entries before it are
whatever the client sent. This assumes exactly one proxy in front of the app,
appending to the header, as nginx's `$proxy_add_x_forwarded_for` does. Behind
more than one, every client shares the outer proxy's address.

## Routes

| Route                            | What it does                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `POST /api/auth/password`        | Signs in with `{ email, password }`                                             |
| `GET`, `POST /api/auth/link`     | The waiting link, and `{ password }` to confirm it                              |
| `POST /api/auth/password/forgot` | `{ email }`. Always 202.                                                        |
| `POST /api/auth/password/reset`  | `{ token, password }`, then signs in                                            |
| `GET`, `PUT /api/me/password`    | `{ hasPassword }`, and `{ current?, password }`, which signs out other sessions |
| `POST /api/auth/password/invite` | Platform admins only                                                            |

## Tests

`test/` boots the layer with in-memory passwords, a plain hasher and an outbox
endpoint. The MariaDB store passes `passwordRepositoryContract` against
`NUXT_TEST_DATABASE_URL`, after the shell's test migrations, with its own
journal: run `pnpm --filter @kmjbyrne/nuxt-passwords db:test-generate` after
changing the schema.
