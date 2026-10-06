import { describe, expect, it } from 'vitest'
import type { Membership } from '../entities/Membership'
import type { Org } from '../entities/Org'
import type { PlatformRoleGrant, User } from '../entities/User'
import type { Workspace } from '../entities/Workspace'
import type { WorkspaceMembership } from '../entities/WorkspaceMembership'
import { AlreadyMemberError, EmailTakenError, IdentityInUseError, SlugTakenError } from '../errors'
import type { Repositories } from '../ports/Repositories'
import type { Email } from '../values/Email'
import type { OrgId, UserId, WorkspaceId } from '../values/Ids'
import type { Name } from '../values/Name'
import type { Slug } from '../values/Slug'

const admin = (grantedBy: UserId | null): PlatformRoleGrant => ({ role: 'admin', grantedAt: new Date('2026-01-02T03:04:05.678Z'), grantedBy })
const google = (subject: string) => ({ provider: 'google', subject, linkedAt: new Date('2026-01-02T03:04:05.678Z') })

/** Ids are unique per call, so a repositories shared between tests never clashes. */
let sequence = 0
const id = () => `id-${++sequence}-${Math.random().toString(36).slice(2, 8)}`

function user(overrides: Partial<User> = {}): User {
  const key = id()
  return {
    id: key as UserId,
    displayName: `User ${key}` as Name,
    email: `${key}@example.com` as Email,
    avatarUrl: null,
    platformRole: null,
    identities: [],
    deactivatedAt: null,
    ...overrides
  }
}

function org(overrides: Partial<Org> = {}): Org {
  const key = id()
  return { id: key as OrgId, name: `Org ${key}` as Name, slug: key as Slug, previousSlugs: [], isPersonal: false, ...overrides }
}

function workspace(orgId: OrgId, overrides: Partial<Workspace> = {}): Workspace {
  const key = id()
  return { id: key as WorkspaceId, orgId, name: `Workspace ${key}` as Name, slug: key as Slug, createdAt: new Date(), ...overrides }
}

/**
 * The behaviour every implementation of core's repositories must have. Call
 * it from a test file with a function that returns a repositories. The repositories may be
 * shared between tests: every test makes its own records.
 */
export function repositoryContract(createRepositories: () => Repositories | Promise<Repositories>): void {
  describe('users', () => {
    it('finds a user by id, email and identity', async () => {
      const repositories = await createRepositories()
      const ada = user({ identities: [google(id())] })
      await repositories.users.create(ada)

      expect(await repositories.users.findById(ada.id)).toEqual(ada)
      expect(await repositories.users.findByEmail(ada.email)).toEqual(ada)
      expect(await repositories.users.findByIdentity(ada.identities[0]!)).toEqual(ada)
      expect(await repositories.users.findById(id() as UserId)).toBeNull()
      expect(await repositories.users.findByIdentity({ provider: 'other', subject: ada.identities[0]!.subject })).toBeNull()
    })

    it('lists users by display name', async () => {
      const repositories = await createRepositories()
      const prefix = id()
      await repositories.users.create(user({ displayName: `${prefix} b` as Name }))
      await repositories.users.create(user({ displayName: `${prefix} a` as Name }))
      const names = (await repositories.users.list()).map(found => found.displayName).filter(name => name.startsWith(prefix))

      expect(names).toEqual([`${prefix} a`, `${prefix} b`])
    })

    it('rejects a second user with the same email', async () => {
      const repositories = await createRepositories()
      const ada = user()
      await repositories.users.create(ada)

      await expect(repositories.users.create(user({ email: ada.email }))).rejects.toThrow(EmailTakenError)
    })

    it('updates a user but not their identities', async () => {
      const repositories = await createRepositories()
      const ada = user({ identities: [google(id())] })
      await repositories.users.create(ada)
      const changed = { ...ada, displayName: 'Ada L' as Name, avatarUrl: 'https://example.com/a.png', platformRole: admin(null), identities: [], deactivatedAt: new Date('2026-03-01T12:00:00.123Z') }
      await repositories.users.update(changed)

      expect(await repositories.users.findById(ada.id)).toEqual({ ...changed, identities: ada.identities, platformRole: null })
    })

    it('rejects an update to another user\'s email', async () => {
      const repositories = await createRepositories()
      const ada = user()
      const grace = user()
      await repositories.users.create(ada)
      await repositories.users.create(grace)

      await expect(repositories.users.update({ ...grace, email: ada.email })).rejects.toThrow(EmailTakenError)
    })

    it('links an identity once, and only to one user', async () => {
      const repositories = await createRepositories()
      const ada = user()
      const grace = user()
      const identity = google(id())
      await repositories.users.create(ada)
      await repositories.users.create(grace)
      await repositories.users.linkIdentity(ada.id, identity)
      await repositories.users.linkIdentity(ada.id, identity)

      expect((await repositories.users.findByIdentity(identity))?.id).toBe(ada.id)
      expect((await repositories.users.findById(ada.id))?.identities).toEqual([identity])
      await expect(repositories.users.linkIdentity(grace.id, identity)).rejects.toThrow(IdentityInUseError)
    })

    it('creates a user with a platform role, and grants, replaces and removes one', async () => {
      const repositories = await createRepositories()
      const pat = user({ platformRole: admin(null) })
      const ada = user()
      await repositories.users.create(pat)
      await repositories.users.create(ada)
      expect((await repositories.users.findById(pat.id))?.platformRole).toEqual(admin(null))

      await repositories.users.setPlatformRole(ada.id, admin(pat.id))
      expect((await repositories.users.findById(ada.id))?.platformRole).toEqual(admin(pat.id))
      await repositories.users.setPlatformRole(ada.id, admin(null))
      expect((await repositories.users.findById(ada.id))?.platformRole).toEqual(admin(null))
      await repositories.users.setPlatformRole(ada.id, null)
      expect((await repositories.users.findById(ada.id))?.platformRole).toBeNull()
    })

    it('counts active platform admins', async () => {
      const repositories = await createRepositories()
      const before = await repositories.users.countPlatformAdmins()
      await repositories.users.create(user({ platformRole: admin(null) }))
      await repositories.users.create(user({ platformRole: admin(null), deactivatedAt: new Date() }))
      await repositories.users.create(user())

      expect(await repositories.users.countPlatformAdmins()).toBe(before + 1)
    })
  })

  describe('orgs', () => {
    it('finds an org by id and current slug, and by a previous slug only when asked', async () => {
      const repositories = await createRepositories()
      const acme = org({ previousSlugs: [id() as Slug], isPersonal: true })
      await repositories.orgs.create(acme)

      expect(await repositories.orgs.findById(acme.id)).toEqual(acme)
      expect(await repositories.orgs.findBySlug(acme.slug)).toEqual(acme)
      expect(await repositories.orgs.findBySlug(acme.previousSlugs[0]!)).toBeNull()
      expect(await repositories.orgs.findBySlugOrPrevious(acme.previousSlugs[0]!)).toEqual(acme)
      expect(await repositories.orgs.findBySlugOrPrevious(acme.slug)).toEqual(acme)
    })

    it('lists orgs by name', async () => {
      const repositories = await createRepositories()
      const prefix = id()
      await repositories.orgs.create(org({ name: `${prefix} b` as Name }))
      await repositories.orgs.create(org({ name: `${prefix} a` as Name }))
      const names = (await repositories.orgs.list()).map(found => found.name).filter(name => name.startsWith(prefix))

      expect(names).toEqual([`${prefix} a`, `${prefix} b`])
    })

    it('rejects a slug that is another org\'s current or previous slug', async () => {
      const repositories = await createRepositories()
      const acme = org({ previousSlugs: [id() as Slug] })
      await repositories.orgs.create(acme)

      await expect(repositories.orgs.create(org({ slug: acme.slug }))).rejects.toThrow(SlugTakenError)
      await expect(repositories.orgs.create(org({ slug: acme.previousSlugs[0]! }))).rejects.toThrow(SlugTakenError)
      await expect(repositories.orgs.create(org({ previousSlugs: [acme.slug] }))).rejects.toThrow(SlugTakenError)
    })

    it('updates an org, and checks its slugs against other orgs only', async () => {
      const repositories = await createRepositories()
      const acme = org()
      const globex = org()
      await repositories.orgs.create(acme)
      await repositories.orgs.create(globex)
      const renamed = { ...acme, name: 'Acme Two' as Name, slug: id() as Slug, previousSlugs: [acme.slug] }
      await repositories.orgs.update(renamed)

      expect(await repositories.orgs.findById(acme.id)).toEqual(renamed)
      await expect(repositories.orgs.update({ ...globex, slug: acme.slug })).rejects.toThrow(SlugTakenError)
    })
  })

  describe('workspaces', () => {
    it('finds a workspace by id, and by org and slug', async () => {
      const repositories = await createRepositories()
      const acme = org()
      await repositories.orgs.create(acme)
      const general = workspace(acme.id)
      await repositories.workspaces.create(general)

      expect(await repositories.workspaces.findById(general.id)).toEqual(general)
      expect(await repositories.workspaces.findById(id() as WorkspaceId)).toBeNull()
      expect(await repositories.workspaces.findBySlug(acme.id, general.slug)).toEqual(general)
      expect(await repositories.workspaces.findBySlug(id() as OrgId, general.slug)).toBeNull()
    })

    it('lists an org\'s workspaces oldest first', async () => {
      const repositories = await createRepositories()
      const acme = org()
      await repositories.orgs.create(acme)
      const newer = workspace(acme.id, { createdAt: new Date('2026-02-01T00:00:00Z') })
      const older = workspace(acme.id, { createdAt: new Date('2026-01-01T00:00:00Z') })
      await repositories.workspaces.create(newer)
      await repositories.workspaces.create(older)

      expect((await repositories.workspaces.listByOrg(acme.id)).map(found => found.id)).toEqual([older.id, newer.id])
    })

    it('rejects a slug the org already uses, but not one another org uses', async () => {
      const repositories = await createRepositories()
      const acme = org()
      const globex = org()
      await repositories.orgs.create(acme)
      await repositories.orgs.create(globex)
      const slug = id() as Slug
      await repositories.workspaces.create(workspace(acme.id, { slug }))
      await repositories.workspaces.create(workspace(globex.id, { slug }))

      await expect(repositories.workspaces.create(workspace(acme.id, { slug }))).rejects.toThrow(SlugTakenError)
    })
  })

  describe('memberships', () => {
    async function orgAndUsers(repositories: Repositories) {
      const acme = org()
      const ada = user()
      const grace = user()
      await repositories.orgs.create(acme)
      await repositories.users.create(ada)
      await repositories.users.create(grace)
      return { acme, ada, grace }
    }

    it('adds, finds, lists, changes and removes memberships', async () => {
      const repositories = await createRepositories()
      const { acme, ada, grace } = await orgAndUsers(repositories)
      const owner: Membership = { orgId: acme.id, userId: ada.id, role: 'owner' }
      const member: Membership = { orgId: acme.id, userId: grace.id, role: 'member' }
      await repositories.memberships.add(owner)
      await repositories.memberships.add(member)

      expect(await repositories.memberships.find(acme.id, ada.id)).toEqual(owner)
      expect(await repositories.memberships.listByOrg(acme.id)).toHaveLength(2)
      expect(await repositories.memberships.listByUser(grace.id)).toEqual([member])

      await repositories.memberships.update({ ...member, role: 'admin' })
      expect((await repositories.memberships.find(acme.id, grace.id))?.role).toBe('admin')

      await repositories.memberships.remove(acme.id, grace.id)
      expect(await repositories.memberships.find(acme.id, grace.id)).toBeNull()
    })

    it('rejects a second membership for the same user and org', async () => {
      const repositories = await createRepositories()
      const { acme, ada } = await orgAndUsers(repositories)
      await repositories.memberships.add({ orgId: acme.id, userId: ada.id, role: 'member' })

      await expect(repositories.memberships.add({ orgId: acme.id, userId: ada.id, role: 'admin' })).rejects.toThrow(AlreadyMemberError)
    })
  })

  describe('workspace memberships', () => {
    async function workspaceAndUsers(repositories: Repositories) {
      const acme = org()
      const ada = user()
      const grace = user()
      await repositories.orgs.create(acme)
      await repositories.users.create(ada)
      await repositories.users.create(grace)
      const general = workspace(acme.id)
      await repositories.workspaces.create(general)
      return { general, ada, grace }
    }

    it('adds, finds, lists, changes and removes workspace memberships', async () => {
      const repositories = await createRepositories()
      const { general, ada, grace } = await workspaceAndUsers(repositories)
      const owner: WorkspaceMembership = { workspaceId: general.id, userId: ada.id, role: 'owner' }
      const viewer: WorkspaceMembership = { workspaceId: general.id, userId: grace.id, role: 'viewer' }
      await repositories.workspaceMembers.add(owner)
      await repositories.workspaceMembers.add(viewer)

      expect(await repositories.workspaceMembers.find(general.id, ada.id)).toEqual(owner)
      expect(await repositories.workspaceMembers.listByWorkspace(general.id)).toHaveLength(2)
      expect(await repositories.workspaceMembers.listByUser(grace.id)).toEqual([viewer])

      await repositories.workspaceMembers.update({ ...viewer, role: 'editor' })
      expect((await repositories.workspaceMembers.find(general.id, grace.id))?.role).toBe('editor')

      await repositories.workspaceMembers.remove(general.id, grace.id)
      expect(await repositories.workspaceMembers.find(general.id, grace.id)).toBeNull()
    })

    it('rejects a second membership for the same user and workspace', async () => {
      const repositories = await createRepositories()
      const { general, ada } = await workspaceAndUsers(repositories)
      await repositories.workspaceMembers.add({ workspaceId: general.id, userId: ada.id, role: 'viewer' })

      await expect(repositories.workspaceMembers.add({ workspaceId: general.id, userId: ada.id, role: 'owner' })).rejects.toThrow(AlreadyMemberError)
    })
  })

  describe('workspace invitations', () => {
    it('puts, lists, replaces and removes invitations by email', async () => {
      const repositories = await createRepositories()
      const acme = org()
      const ada = user()
      await repositories.orgs.create(acme)
      await repositories.users.create(ada)
      const general = workspace(acme.id)
      const finance = workspace(acme.id)
      await repositories.workspaces.create(general)
      await repositories.workspaces.create(finance)
      const email = `${id()}@example.com` as Email
      const first = { workspaceId: general.id, email, role: 'viewer' as const, invitedBy: ada.id, createdAt: new Date('2026-06-01T12:00:00.123Z') }
      const second = { ...first, workspaceId: finance.id, createdAt: new Date('2026-06-01T12:05:00.123Z') }
      await repositories.invitations.put(first)
      await repositories.invitations.put(second)
      await repositories.invitations.put({ ...first, role: 'editor' })

      expect(await repositories.invitations.listByWorkspace(general.id)).toEqual([{ ...first, role: 'editor' }])
      expect((await repositories.invitations.listByEmail(email)).map(invitation => invitation.workspaceId).sort()).toEqual([general.id, finance.id].sort())
      await repositories.invitations.remove(general.id, email)
      expect(await repositories.invitations.listByWorkspace(general.id)).toEqual([])
      expect(await repositories.invitations.listByEmail(email)).toEqual([second])
    })
  })

  describe('transactions', () => {
    it('keeps every write when the callback resolves, and returns its value', async () => {
      const repositories = await createRepositories()
      const acme = org()
      const ada = user()

      const result = await repositories.transaction(async (tx) => {
        await tx.orgs.create(acme)
        await tx.users.create(ada)
        await tx.memberships.add({ orgId: acme.id, userId: ada.id, role: 'owner' })
        return 'done'
      })

      expect(result).toBe('done')
      expect(await repositories.memberships.find(acme.id, ada.id)).not.toBeNull()
    })

    it('joins a transaction started inside another into it', async () => {
      const repositories = await createRepositories()
      const acme = org()

      await expect(repositories.transaction(async (tx) => {
        await tx.transaction(inner => inner.orgs.create(acme))
        throw new Error('roll back both')
      })).rejects.toThrow('roll back both')
      expect(await repositories.orgs.findById(acme.id)).toBeNull()
    })

    it('keeps no write when the callback throws', async () => {
      const repositories = await createRepositories()
      const acme = org()

      await expect(repositories.transaction(async (tx) => {
        await tx.orgs.create(acme)
        await tx.workspaces.create(workspace(acme.id))
        throw new Error('changed my mind')
      })).rejects.toThrow('changed my mind')
      expect(await repositories.orgs.findById(acme.id)).toBeNull()
      expect(await repositories.workspaces.listByOrg(acme.id)).toEqual([])
    })
  })
}
