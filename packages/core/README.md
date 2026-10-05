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

## Two Kinds of Roles

The **platform role** belongs to a user and covers the whole platform. A user is
a platform admin (`isPlatformAdmin`) or not. Platform admins create orgs and
users, and assign memberships. Being one doesn't make a user a member of any
org.

The **org role** belongs to a membership and covers one org: `owner`, `admin` or
`member`. Owners and admins run their org day to day, which for now means
creating workspaces. An app that needs finer permissions keeps them as its own
data, keyed by org and user.

## Entities

| Entity       | Fields                                                                     |
| ------------ | -------------------------------------------------------------------------- |
| `User`       | `id`, `displayName`, `email`, `avatarUrl`, `isPlatformAdmin`, `identities` |
| `Org`        | `id`, `name`, `slug`, `previousSlugs`                                      |
| `Workspace`  | `id`, `orgId`, `name`, `slug`, `createdAt`                                 |
| `Membership` | `userId`, `orgId`, `role`                                                  |

An org contains workspaces. An app's own entities refer to these by id
(`UserId`, `OrgId`, `WorkspaceId`), and never extend them.

The rules that live on the entities:

- `changeOrgSlug` moves the old slug to `previousSlugs`, so old links keep
  working. Moving back to an old slug takes it off the list.
- `ensureOwnerRemains` throws `LastOwnerError` if a role change or removal would
  leave an org with no owner.
- `canManageWorkspaces` is true for owners and admins.
- A new org's first workspace is `DEFAULT_WORKSPACE`: "General", at `general`.

## Errors

Every error the domain throws on purpose extends `DomainError`, so an adapter
can map it to a response:

| Error               | Meaning                                                  | HTTP |
| ------------------- | -------------------------------------------------------- | ---- |
| `InvalidInputError` | Input breaks a value's rules. Subclasses name the value. | 400  |
| `NotSignedInError`  | No one is signed in                                      | 401  |
| `ForbiddenError`    | Signed in, but not allowed                               | 403  |
| `NotInvitedError`   | Signed in at the provider, but no account exists here    | 403  |
| `NotFoundError`     | Missing, or exists but the caller may not see it         | 404  |
| `ConflictError`     | Clashes with stored data. Subclasses below.              | 409  |

The conflicts are `SlugTakenError`, `EmailTakenError`, `AlreadyMemberError`,
`IdentityInUseError`, `LastOwnerError` and `LastPlatformAdminError`.

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
