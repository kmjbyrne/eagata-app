import { describe, expect, it } from 'vitest'
import { EmailTakenError, ForbiddenError, LastPlatformAdminError, NotFoundError, NotSignedInError } from '../errors'
import { createTestServices } from '../testing/createTestServices'
import type { UserId } from '../values/Ids'

async function setup() {
  const t = createTestServices()
  const admin = await t.signUp('Pat Platform', { platformAdmin: true })
  const ada = await t.signUp('Ada Lovelace')
  t.signInAs(admin)
  return { t, admin, ada }
}

describe('PlatformUserService', () => {
  it('refuses everyone but platform admins', async () => {
    const { t, ada } = await setup()
    t.signInAs(ada)

    await expect(t.services.platformUsers.create('Grace', 'grace@example.com')).rejects.toThrow(ForbiddenError)
    await expect(t.services.platformUsers.list()).rejects.toThrow(ForbiddenError)
    await expect(t.services.platformUsers.get(ada.id)).rejects.toThrow(ForbiddenError)
    await expect(t.services.platformUsers.setPlatformAdmin(ada.id, true)).rejects.toThrow(ForbiddenError)
  })

  describe('create', () => {
    it('creates a user with a personal org, who has not signed in yet', async () => {
      const { t } = await setup()
      const grace = await t.services.platformUsers.create('Grace Hopper', 'Grace@Example.com')
      const detail = await t.services.platformUsers.get(grace.id)

      expect(grace).toMatchObject({ email: 'grace@example.com', identities: [], isPlatformAdmin: false })
      expect(detail.orgs.map(entry => [entry.org.slug, entry.org.isPersonal, entry.role])).toEqual([['grace-hopper', true, 'owner']])
    })

    it('links the identity on first sign-in, without a second personal org', async () => {
      const { t } = await setup()
      const grace = await t.services.platformUsers.create('Grace Hopper', 'grace@example.com')
      const signedIn = await t.signUp('Grace H', { email: 'grace@example.com' })

      expect(signedIn.id).toBe(grace.id)
      expect(await t.repositories.memberships.listByUser(grace.id)).toHaveLength(1)
    })

    it('rejects an email already in use', async () => {
      const { t, ada } = await setup()

      await expect(t.services.platformUsers.create('Another Ada', ada.email)).rejects.toThrow(EmailTakenError)
    })
  })

  describe('list and get', () => {
    it('lists users by name, and shows one with their orgs', async () => {
      const { t, ada } = await setup()
      await t.services.platformOrgs.create('Acme', ada.id)

      expect((await t.services.platformUsers.list()).map(user => user.displayName)).toEqual(['Ada Lovelace', 'Pat Platform'])
      expect((await t.services.platformUsers.get(ada.id)).orgs.map(entry => entry.org.slug)).toEqual(['ada-lovelace', 'acme'])
      await expect(t.services.platformUsers.get('nobody' as UserId)).rejects.toThrow(NotFoundError)
    })
  })

  describe('setDeactivated', () => {
    it('deactivates a user, ending their session, and reactivates them with their access intact', async () => {
      const { t, admin, ada } = await setup()
      await t.services.platformUsers.setDeactivated(ada.id, true)
      t.signInAs(ada)
      await expect(t.services.orgs.listMine()).rejects.toThrow(NotSignedInError)
      await expect(t.services.users.getMe()).rejects.toThrow(NotSignedInError)

      t.signInAs(admin)
      await t.services.platformUsers.setDeactivated(ada.id, false)
      t.signInAs(ada)
      expect((await t.services.orgs.listMine())[0]!.org.slug).toBe('ada-lovelace')
    })

    it('keeps the platform admin from deactivating themselves', async () => {
      const { t, admin } = await setup()

      await expect(t.services.platformUsers.setDeactivated(admin.id, true)).rejects.toThrow(ForbiddenError)
    })

    it('keeps one active platform admin', async () => {
      const { t, admin, ada } = await setup()
      await t.services.platformUsers.setPlatformAdmin(ada.id, true)
      t.signInAs(ada)
      await t.services.platformUsers.setDeactivated(admin.id, true)

      await expect(t.services.platformUsers.setPlatformAdmin(ada.id, false)).rejects.toThrow(LastPlatformAdminError)
    })
  })

  describe('setPlatformAdmin', () => {
    it('grants and revokes the platform role', async () => {
      const { t, ada } = await setup()
      await t.services.platformUsers.setPlatformAdmin(ada.id, true)
      expect((await t.repositories.users.findById(ada.id))?.isPlatformAdmin).toBe(true)

      await t.services.platformUsers.setPlatformAdmin(ada.id, false)
      expect((await t.repositories.users.findById(ada.id))?.isPlatformAdmin).toBe(false)
    })

    it('keeps at least one platform admin', async () => {
      const { t, admin } = await setup()

      await expect(t.services.platformUsers.setPlatformAdmin(admin.id, false)).rejects.toThrow(LastPlatformAdminError)
    })
  })
})
