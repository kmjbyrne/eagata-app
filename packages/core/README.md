# @kmjbyrne/core

The domain every app shares: users, organizations, workspaces, memberships, and
the rules for who may sign in and who may do what. It is plain TypeScript. It
has no Nuxt, HTTP or storage code, and no dependencies. Storage and sign-in
reach it through ports, which adapters elsewhere implement.

## Install

The package is published to npm with restricted access, so installing it needs
an npm login with access to the `@kmjbyrne` scope:

```bash
npm login
pnpm add @kmjbyrne/core
```

Inside this repository, depend on it from the workspace instead:

```json
{ "dependencies": { "@kmjbyrne/core": "workspace:*" } }
```

## Conventions

Ids, emails and names are branded strings. A plain string becomes one only
through its `parse` function, which throws an `InvalidInputError` subclass when
the input breaks the value's rules:

```ts
import { parseEmail, parseName } from '@kmjbyrne/core'

const email = parseEmail(' Ada@Example.com ')
const name = parseName('Ada  Lovelace')
```

## Slugs

Orgs and workspaces are addressed by slug: `/acme/general`. A slug has 3 to 32
lowercase letters, numbers and single hyphens, and doesn't start or end with a
hyphen. `parseSlug` checks those rules. `parseOrgSlug` also rejects
`RESERVED_ORG_SLUGS`, the names of the app's fixed top-level routes such as
`login` and `platform`, so an org can never hide one. Keep that list in step
with the routes.

`suggestSlug(name)` turns a name into a valid slug. It drops accents, joins the
words with hyphens, and cuts at a word boundary. It also drops company suffixes
such as "Ltd" and "Inc" from the end. "Café Ólafsson Ltd" becomes
`cafe-olafsson`. A name too short for a slug gets `-1` added, and a name with no
letters or numbers throws.

## Errors

Entities are plain interfaces. Every error the domain throws on purpose extends
`DomainError`, so an adapter can map it to a response.

## API

| Export                                                | What it is                                                      |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| `User`, `UserIdentity`, `ProviderIdentity`            | A user, a linked provider account, and what a provider asserted |
| `UserId`, `OrgId`, `WorkspaceId`                      | Branded ids, with `parseUserId` and the like                    |
| `Email`, `parseEmail`                                 | Trimmed and lowercased, at most 255 characters                  |
| `Name`, `parseName`                                   | Trimmed, inner whitespace collapsed, 1 to 100 characters        |
| `DomainError`                                         | The base of every deliberate error                              |
| `InvalidInputError`                                   | Input that breaks a value's rules                               |
| `NotFoundError`, `ForbiddenError`, `NotSignedInError` | Lookups and access                                              |
