import { describe, expect, it } from 'vitest'
import type { ProviderIdentity } from '../entities/User'
import { EmailNotVerifiedError, IdentityMismatchError } from '../errors'
import { createTestServices } from '../testing/createTestServices'
import { parseEmail } from '../values/Email'
import type { UserId } from '../values/Ids'
import { parseName } from '../values/Name'

function identity(overrides: Partial<ProviderIdentity> = {}): ProviderIdentity {
  return {
    provider: 'google',
    subject: 'g-ada',
    email: parseEmail('ada@example.com'),
    emailVerified: true,
    name: 'Ada Lovelace',
    picture: null,
    ...overrides
  }
}

describe('AuthService.signIn', () => {
  describe('signing up', () => {
    it('creates the user with a personal org, its first workspace, and both memberships', async () => {
      const t = createTestServices()
      const ada = await t.services.auth.signIn(identity({ picture: 'https://example.com/ada.png' }))

      expect(ada).toMatchObject({
        displayName: 'Ada Lovelace',
        email: 'ada@example.com',
        avatarUrl: 'https://example.com/ada.png',
        isPlatformAdmin: false,
        identities: [{ provider: 'google', subject: 'g-ada' }]
      })
      const [membership] = await t.repositories.memberships.listByUser(ada.id)
      const org = await t.repositories.orgs.findById(membership!.orgId)
      const [workspace] = await t.repositories.workspaces.listByOrg(org!.id)
      expect(membership!.role).toBe('owner')
      expect(org).toMatchObject({ name: 'Ada Lovelace', slug: 'ada-lovelace', isPersonal: true })
      expect(workspace).toMatchObject({ name: 'General', slug: 'general' })
      expect(await t.repositories.workspaceMembers.find(workspace!.id, ada.id)).toMatchObject({ role: 'owner' })
    })

    it('names the user after their email when the provider sends no name', async () => {
      const t = createTestServices()

      expect((await t.services.auth.signIn(identity({ name: null }))).displayName).toBe('ada')
    })

    it('gives each personal org a free slug, skipping reserved ones', async () => {
      const t = createTestServices()
      await t.services.auth.signIn(identity())
      const second = await t.services.auth.signIn(identity({ subject: 'g-ada-2', email: parseEmail('ada@other.com') }))
      const admin = await t.services.auth.signIn(identity({ subject: 'g-admin', email: parseEmail('admin@example.com'), name: 'Admin' }))

      const slugOf = async (userId: UserId) => {
        const [membership] = await t.repositories.memberships.listByUser(userId)
        return (await t.repositories.orgs.findById(membership!.orgId))!.slug
      }
      expect(await slugOf(second.id)).toBe('ada-lovelace-2')
      expect(await slugOf(admin.id)).toBe('admin-2')
    })

    it('refuses an unverified email and creates nothing', async () => {
      const t = createTestServices()

      await expect(t.services.auth.signIn(identity({ emailVerified: false }))).rejects.toThrow(EmailNotVerifiedError)
      expect(await t.repositories.users.list()).toEqual([])
      expect(await t.repositories.orgs.list()).toEqual([])
    })
  })

  describe('signing in', () => {
    it('signs the same user in again, refreshing the avatar, without a second personal org', async () => {
      const t = createTestServices()
      const first = await t.services.auth.signIn(identity())
      const again = await t.services.auth.signIn(identity({ picture: 'https://example.com/new.png' }))

      expect(again.id).toBe(first.id)
      expect((await t.repositories.users.findById(first.id))?.avatarUrl).toBe('https://example.com/new.png')
      expect(await t.repositories.orgs.list()).toHaveLength(1)
    })

    it('signs in by identity even after the email changed at the provider', async () => {
      const t = createTestServices()
      const first = await t.services.auth.signIn(identity())

      expect((await t.services.auth.signIn(identity({ email: parseEmail('lovelace@example.com') }))).id).toBe(first.id)
    })

    it('links a verified email to a user who has not signed in yet', async () => {
      const t = createTestServices()
      const created = await t.repositories.transaction(async (tx) => {
        const user = { id: 'u-made' as UserId, displayName: parseName('Ada'), email: parseEmail('ada@example.com'), avatarUrl: null, isPlatformAdmin: false, identities: [] }
        await tx.users.create(user)
        return user
      })
      const signedIn = await t.services.auth.signIn(identity())

      expect(signedIn.id).toBe(created.id)
      expect((await t.repositories.users.findById(created.id))?.identities).toEqual([{ provider: 'google', subject: 'g-ada' }])
      expect(await t.repositories.orgs.list()).toEqual([])
    })

    it('never links an unverified email to an existing user', async () => {
      const t = createTestServices()
      await t.services.auth.signIn(identity())

      await expect(t.services.auth.signIn(identity({ subject: 'g-impostor', emailVerified: false }))).rejects.toThrow(EmailNotVerifiedError)
    })

    it('refuses a second account at the same provider for the same email', async () => {
      const t = createTestServices()
      await t.services.auth.signIn(identity())

      await expect(t.services.auth.signIn(identity({ subject: 'g-someone-else' }))).rejects.toThrow(IdentityMismatchError)
    })

    it('links an account at another provider to the same user', async () => {
      const t = createTestServices()
      const ada = await t.services.auth.signIn(identity())
      const viaOther = await t.services.auth.signIn(identity({ provider: 'microsoft', subject: 'm-ada' }))

      expect(viaOther.id).toBe(ada.id)
      expect(viaOther.identities).toHaveLength(2)
    })
  })
})
