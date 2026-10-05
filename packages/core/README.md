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

- **Platform role**, a grant held by a few users: `platformRole` is
  `{ role: 'admin', grantedAt, grantedBy }`, or null for everyone else.
  `isPlatformAdmin(user)` checks it. A platform admin runs the platform and
  creates company orgs. Being one doesn't make a user a member of any org.
  Repositories save it with `setPlatformRole`, never `update`, and granting it
  again keeps the first grant.
- **Org role**, on an org membership: `owner`, `admin` or `member`. Owners and
  admins run the org, create its workspaces, and act as owners of every
  workspace in it.
- **Workspace role**, on a workspace membership: `owner`, `editor` or `viewer`.
  Plain org members, and people from outside the org, see a workspace only
  through a workspace membership. That is how a workspace is shared.

`effectiveWorkspaceRole(orgRole, membership)` combines the last two into what a
user may do in a workspace, or null for no access.

## Entities

| Entity       | Fields                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------- |
| `User`       | `id`, `displayName`, `email`, `avatarUrl`, `platformRole`, `identities`, `deactivatedAt` |
| `Org`        | `id`, `name`, `slug`, `previousSlugs`                                                    |
| `Workspace`  | `id`, `orgId`, `name`, `slug`, `createdAt`                                               |
| `Membership` | `userId`, `orgId`, `role`                                                                |

An org contains workspaces. An app's own entities refer to these by id
(`UserId`, `OrgId`, `WorkspaceId`), and never extend them.

The rules that live on the entities:

- `changeOrgSlug` moves the old slug to `previousSlugs`, so old links keep
  working. Moving back to an old slug takes it off the list.
- `ensureOwnerRemains` throws `LastOwnerError` if a role change or removal would
  leave an org with no owner.
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

## Signing In

Registration is closed: only people a platform admin set up can sign in.
`AuthService.signIn(identity)` takes what a provider asserted, and returns the
user to sign in. It runs in one transaction:

1. A user who already has this identity (provider and subject) is signed in,
   whatever email the provider now reports.
2. Otherwise, a verified email that matches a user links the identity to that
   user, on their first sign-in. If that user already has a different account at
   the same provider, it throws `IdentityMismatchError`, because the provider
   may have given the email to someone new.
3. Anyone else gets `NotInvitedError`, and nothing is created.

`signIn` returns `{ kind: 'signed-in', user }`, or
`{ kind: 'link-required', link }` when an optional `LinkProof` port says linking
needs proof first, such as the user's password. The caller collects the proof,
and the code that checks it links the account. Without a `LinkProof`, a verified
email is enough.

`connectIdentity(identity)` links a provider account to the signed-in user, from
their settings.

An unverified email never links, and throws `EmailNotVerifiedError`. A
deactivated user is refused with `AccountDeactivatedError`, whether matched by
identity or by email. Each sign-in refreshes the user's avatar from the
provider. The display name stays as the platform admin entered it.

`bootstrapPlatformAdmin(repositories, ids, { email, displayName? })` makes
someone a platform admin, creating them if they don't exist. It is for the first
platform admin of a fresh install, and checks no permission, so only tools with
direct database access call it.

Platform admins create users with `platformUsers.create`. That also creates the
user's personal org, its "General" workspace, and owner memberships of both. A
personal org's slug comes from the user's name, with `-2`, `-3` and so on added
until it is free. Reserved slugs are skipped.

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
- `home(lastUsed)` says where `/` goes: the last-used workspace if the user can
  still reach it, else the first workspace of their only org, else null, meaning
  they should choose between orgs.
- Anything the user can't see is a `NotFoundError`, so its existence isn't
  revealed. Old org slugs aren't accepted, except by `resolveSlug`, which
  returns the current slug so an old link can redirect.
- Org owners and admins create workspaces, and become the new workspace's owner.
- Workspace owners add people by the email of an existing account, and change or
  remove members. Any member can remove themselves. A workspace always keeps an
  owner.

### Permissions

Code asks for a permission, never a role. `workspacePermissions` and
`orgPermissions` map each permission to the least role that holds it, and a role
holds every permission of the roles below it, so a role's powers change in one
place.

| Permission          | Least role         |
| ------------------- | ------------------ |
| `workspace.view`    | Workspace `viewer` |
| `members.view`      | Workspace `viewer` |
| `members.manage`    | Workspace `owner`  |
| `org.view`          | Org `member`       |
| `workspaces.create` | Org `admin`        |

An app adds its own by extending the workspace set:

```ts
export const notePermissions = workspacePermissions.extend({
  'notes.read': 'viewer',
  'notes.edit': 'editor'
})
```

`can(role, permission)` checks one, and `of(role)` lists a role's permissions.
Org and workspace responses carry `permissions`, so pages show or hide controls
by permission too. `definePermissions(roles, map)` makes a new set over any
ordered roles.

### WorkspaceAccess

An app's own services call
`workspaceAccess.require(orgSlug, workspaceSlug, permission, permissions?)`
before acting in a workspace, so every app checks access the same way. Without
`permissions`, it checks core's own:

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
      'notes.edit',
      notePermissions
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
their role lacks the permission.

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
| `LinkProof`            | Whether linking a provider account needs proof, such as a password   |
| `EmailSender`          | Sends an email                                                       |
| `RateLimiter`          | Counts attempts per key, for limits such as failed passwords         |

The repositories enforce uniqueness themselves, so two requests at once can't
both win: emails across users, identities across users, org slugs across every
org's current and previous slugs, and workspace slugs within an org.

## Testing

`@kmjbyrne/core/contract` exports `repositoryContract(createRepositories)`, a
Vitest suite that every implementation of `Repositories` must pass. Each test
makes its own records, so one set of repositories can be shared between tests.

`@kmjbyrne/core/testing` has the fakes. It doesn't import Vitest, so a test
server can use them too.

- `InMemoryRepositories` implements every repository on plain arrays. It passes
  the contract.
- `FakeCurrentUser` is a `CurrentUser` you can sign in and out.
- `RecordingEmailSender` keeps sent messages in `outbox`, and
  `CountingRateLimiter` counts attempts with no time window.
- `SequentialIdGenerator` makes the ids `id-1`, `id-2` and so on.
- `provisionUser(tx, ids, input)` creates a user with their personal org, as a
  platform admin would, without the permission check. For test setup only.
- `companyOrg(repositories, setup)` writes a company org, its memberships and
  workspaces straight to the repositories, as a platform admin would have made
  them.
- `createTestServices()` builds every service on those. Its `signUp(name)` signs
  a user up as a provider would, and `signInAs(user)` makes them the current
  user:

```ts
import { createTestServices } from '@kmjbyrne/core/testing'

const t = createTestServices()
const ada = await t.addUser('Ada Lovelace')
const admin = await t.addUser('Pat Platform', { platformAdmin: true })
t.signInAs(ada)
```

```ts
import { describe } from 'vitest'
import { repositoryContract } from '@kmjbyrne/core/contract'

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

## Passwords

`@kmjbyrne/core/passwords` is optional. An app without passwords never imports
it, and the main entry doesn't depend on it. `@kmjbyrne/nuxt-passwords` wires it
into a Nuxt app.

`PasswordService` mirrors basecamp-app:

- `signIn(email, password)` answers an unknown email and a wrong password with
  the same `InvalidCredentialsError`. A deactivated account is only revealed
  once the password is right.
- `linkIdentity(pending, password)` links the provider account that sign-in
  matched by email, once the user proves the account with its password.
  `linkProof()` is the `LinkProof` that makes `AuthService.signIn` ask: users
  with a password are asked, users without one link on the verified email.
- `setPassword({ current?, password })` sets the signed-in user's password. One
  they already have must be confirmed.
- `requestReset(email, url)` and `resetPassword(token, password)`: a single-use
  link, valid for 30 minutes. Asking says nothing about whether the email has an
  account.
- `sendInvite(userId, url)` lets a platform admin email a link to choose a
  password, valid for 72 hours.

Passwords are 10 to 256 characters, the only rule, per NIST SP 800-63B. Five
failed checks per account in 15 minutes lock it out for the rest of the window,
and an address gets three reset emails an hour.

The ports are `PasswordHasher` and `PasswordRepository`. Tests use
`InMemoryPasswordRepository` and `PlainPasswordHasher` from
`@kmjbyrne/core/passwords/testing`, and every repository passes
`passwordRepositoryContract` from `@kmjbyrne/core/passwords/contract`.
