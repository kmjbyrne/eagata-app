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

## Orgs, Workspaces and Roles

The org is the top-level tenant, and it contains workspaces. There are two kinds
of org:

- **Personal:** every user has one. Its only org member is that user, as owner.
- **Company:** many users are org members.

Three kinds of role decide who may do what, and they stay separate everywhere:

- **Platform role**, on the user: a platform admin (`isPlatformAdmin`) runs the
  platform and creates company orgs. Being one doesn't make a user a member of
  any org.
- **Org role**, on an org membership: `owner`, `admin` or `member`. Owners and
  admins run the org, create its workspaces, and act as owners of every
  workspace in it.
- **Workspace role**, on a workspace membership: `owner`, `editor` or `viewer`.
  Plain org members, and people from outside the org, see a workspace only
  through a workspace membership. That is how a workspace is shared.

`effectiveWorkspaceRole(orgRole, membership)` combines the last two into what a
user may do in a workspace, or null for no access.

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
`IdentityInUseError`, `IdentityMismatchError`, `LastOwnerError` and
`LastPlatformAdminError`.

## Signing In and Signing Up

`AuthService.signIn(identity)` takes what a provider asserted, and returns the
user to sign in. It runs in one transaction:

1. A user who already has this identity (provider and subject) is signed in,
   whatever email the provider now reports.
2. Otherwise, a verified email that matches a user links the identity to that
   user. If that user already has a different account at the same provider, it
   throws `IdentityMismatchError`, because the provider may have given the email
   to someone new.
3. Otherwise, a verified email signs up: a new user, named from the provider's
   `name` or the email, with a personal org named after them, a "General"
   workspace, and owner memberships of both.

An unverified email never links or signs up. It throws `EmailNotVerifiedError`.
Each sign-in refreshes the user's avatar from the provider. The display name is
left as it is.

A personal org's slug comes from the user's name, with `-2`, `-3` and so on
added until it is free. Reserved slugs are skipped.

## Services

`createCoreServices({ repositories, currentUser, ids })` builds every service on
the given adapters. It is cheap, so build it per request with that request's
`CurrentUser`. Every service acts as the current user, and throws
`NotSignedInError` if there is none.

| Service           | Methods                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| `users`           | `getMe()`                                                                        |
| `orgs`            | `listMine()`, `getBySlug(slug)`, `resolveSlug(oldSlug)`                          |
| `workspaces`      | `list`, `create`, `listMembers`, `addMember`, `changeMemberRole`, `removeMember` |
| `workspaceAccess` | `require(orgSlug, workspaceSlug, role?)`                                         |

The rules they enforce:

- A user sees an org if they're an org member, or a member of one of its
  workspaces. `listMine` returns their personal org first, then the rest by
  name, each with the workspaces the user can see.
- Anything the user can't see is a `NotFoundError`, so its existence isn't
  revealed. Old org slugs aren't accepted, except by `resolveSlug`, which
  returns the current slug so an old link can redirect.
- Org owners and admins create workspaces, and become the new workspace's owner.
- Workspace owners add people by the email of an existing account, and change or
  remove members. Any member can remove themselves. A workspace always keeps an
  owner.

### WorkspaceAccess

An app's own services call
`workspaceAccess.require(orgSlug, workspaceSlug, role)` before acting in a
workspace, so every app checks access the same way:

```ts
class NoteService {
  constructor(
    private readonly notes: NoteRepository,
    private readonly access: WorkspaceAccess
  ) {}

  async create(orgSlug: string, workspaceSlug: string, title: string) {
    const { workspace, userId } = await this.access.require(
      orgSlug,
      workspaceSlug,
      'editor'
    )
    return this.notes.create({
      workspaceId: workspace.id,
      authorId: userId,
      title
    })
  }
}
```

It returns the org, the workspace, the user's effective role and their id. It
throws `NotFoundError` if they can't see the workspace, and `ForbiddenError` if
their role is below the one asked for.

## Ports

Core reaches storage, ids, the session and sign-in only through these
interfaces. Adapters elsewhere implement them.

| Port                   | What it does                                                         |
| ---------------------- | -------------------------------------------------------------------- |
| `UserRepository`       | Users and their linked identities                                    |
| `OrgRepository`        | Orgs by id, current slug, or current-or-previous slug                |
| `WorkspaceRepository`  | Workspaces by org and slug, oldest first                             |
| `MembershipRepository` | Memberships by org or by user                                        |
| `Repositories`         | All the repositories, plus `transaction` for writes that go together |
| `IdGenerator`          | New ids                                                              |
| `CurrentUser`          | The signed-in user's id, or null                                     |
| `SignInProvider`       | Starts and completes a sign-in with an identity provider             |

The repositories enforce uniqueness themselves, so two requests at once can't
both win: emails across users, identities across users, org slugs across every
org's current and previous slugs, and workspace slugs within an org.

## Testing

`@kmjbyrne/core/testing` has what tests need. It needs Vitest.

- `repositoryContract(createRepositories)` is a Vitest suite that every
  implementation of `Repositories` must pass. Each test makes its own records,
  so one set of repositories can be shared between tests.
- `InMemoryRepositories` implements every repository on plain arrays. It passes
  the contract.
- `FakeCurrentUser` is a `CurrentUser` you can sign in and out.
- `SequentialIdGenerator` makes the ids `id-1`, `id-2` and so on.
- `companyOrg(repositories, setup)` writes a company org, its memberships and
  workspaces straight to the repositories, as a platform admin would have made
  them.
- `createTestServices()` builds every service on those. Its `signUp(name)` signs
  a user up as a provider would, and `signInAs(user)` makes them the current
  user:

```ts
import { createTestServices } from '@kmjbyrne/core/testing'

const t = createTestServices()
const ada = await t.signUp('Ada Lovelace')
const admin = await t.signUp('Pat Platform', { platformAdmin: true })
t.signInAs(ada)
```

```ts
import { describe } from 'vitest'
import { repositoryContract } from '@kmjbyrne/core/testing'

describe('MySQL repositories', () => {
  repositoryContract(() => repositories)
})
```

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
