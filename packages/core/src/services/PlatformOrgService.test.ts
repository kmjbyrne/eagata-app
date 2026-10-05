import { describe, expect, it } from 'vitest'
import { AlreadyMemberError, ForbiddenError, LastOwnerError, NotFoundError, NotSignedInError, SlugTakenError } from '../errors'
import { createTestServices } from '../testing/createTestServices'
import type { UserId } from '../values/Ids'
import { ReservedSlugError } from '../values/Slug'

async function setup() {
  const t = createTestServices()
  const admin = await t.signUp('Pat Platform', { platformAdmin: true })
  const ada = await t.signUp('Ada Lovelace')
  const grace = await t.signUp('Grace Hopper')
  t.signInAs(admin)
  const acme = await t.services.platformOrgs.create('Acme Ltd', ada.id)
  return { t, admin, ada, grace, acme }
}

describe('PlatformOrgService', () => {
  it('refuses everyone but platform admins', async () => {
    const { t, ada, acme } = await setup()
    const calls = [
      () => t.services.platformOrgs.create('Globex', ada.id),
      () => t.services.platformOrgs.list(),
      () => t.services.platformOrgs.get(acme.slug),
      () => t.services.platformOrgs.changeSlug(acme.slug, 'acme-two'),
      () => t.services.platformOrgs.addMember(acme.slug, ada.id, 'member'),
      () => t.services.platformOrgs.changeRole(acme.slug, ada.id, 'admin'),
      () => t.services.platformOrgs.removeMember(acme.slug, ada.id)
    ]
    t.signInAs(ada)
    for (const call of calls) {
      await expect(call()).rejects.toThrow(ForbiddenError)
    }
    t.signOut()
    for (const call of calls) {
      await expect(call()).rejects.toThrow(NotSignedInError)
    }
  })

  describe('create', () => {
    it('creates a company org with its owner and a General workspace they own', async () => {
      const { t, ada, acme } = await setup()
      const detail = await t.services.platformOrgs.get(acme.slug)

      expect(acme).toMatchObject({ name: 'Acme Ltd', slug: 'acme', isPersonal: false })
      expect(detail.members.map(member => [member.user.id, member.role])).toEqual([[ada.id, 'owner']])
      expect(detail.workspaces.map(workspace => workspace.slug)).toEqual(['general'])
      expect(await t.repositories.workspaceMembers.find(detail.workspaces[0]!.id, ada.id)).toMatchObject({ role: 'owner' })
    })

    it('doesn\'t make the platform admin a member', async () => {
      const { t, admin } = await setup()

      expect(await t.repositories.memberships.listByUser(admin.id)).toHaveLength(1)
    })

    it('takes a chosen slug, and rejects reserved and taken ones', async () => {
      const { t, ada } = await setup()

      expect((await t.services.platformOrgs.create('Globex', ada.id, 'globex-corp')).slug).toBe('globex-corp')
      await expect(t.services.platformOrgs.create('Platform', ada.id)).rejects.toThrow(ReservedSlugError)
      await expect(t.services.platformOrgs.create('Acme', ada.id)).rejects.toThrow(SlugTakenError)
    })

    it('rejects an owner who doesn\'t exist', async () => {
      const { t } = await setup()

      await expect(t.services.platformOrgs.create('Globex', 'nobody' as UserId)).rejects.toThrow(NotFoundError)
    })
  })

  describe('list', () => {
    it('lists every org with its member and workspace counts', async () => {
      const { t } = await setup()
      const rows = (await t.services.platformOrgs.list()).map(row => [row.org.slug, row.memberCount, row.workspaceCount])

      expect(rows).toEqual([['acme', 1, 1], ['ada-lovelace', 1, 1], ['grace-hopper', 1, 1], ['pat-platform', 1, 1]])
    })
  })

  describe('changeSlug', () => {
    it('keeps the old slug redirecting, and keeps it from other orgs', async () => {
      const { t, ada, acme } = await setup()
      await t.services.platformOrgs.changeSlug(acme.slug, 'acme-co')
      t.signInAs(ada)

      expect(await t.services.orgs.resolveSlug('acme')).toBe('acme-co')
      t.signInAs((await t.repositories.users.list()).find(user => user.isPlatformAdmin)!)
      await expect(t.services.platformOrgs.create('Acme', ada.id)).rejects.toThrow(SlugTakenError)
    })
  })

  describe('members', () => {
    it('adds a member, changes their role and removes them', async () => {
      const { t, grace, acme } = await setup()
      await t.services.platformOrgs.addMember(acme.slug, grace.id, 'member')
      await t.services.platformOrgs.changeRole(acme.slug, grace.id, 'admin')

      expect((await t.services.platformOrgs.get(acme.slug)).members.map(member => member.role)).toEqual(['owner', 'admin'])
      await t.services.platformOrgs.removeMember(acme.slug, grace.id)
      expect((await t.services.platformOrgs.get(acme.slug)).members).toHaveLength(1)
    })

    it('rejects someone already a member', async () => {
      const { t, ada, acme } = await setup()

      await expect(t.services.platformOrgs.addMember(acme.slug, ada.id, 'member')).rejects.toThrow(AlreadyMemberError)
    })

    it('keeps at least one owner', async () => {
      const { t, ada, acme } = await setup()

      await expect(t.services.platformOrgs.changeRole(acme.slug, ada.id, 'admin')).rejects.toThrow(LastOwnerError)
      await expect(t.services.platformOrgs.removeMember(acme.slug, ada.id)).rejects.toThrow(LastOwnerError)
    })

    it('adds no one to a personal org', async () => {
      const { t, grace } = await setup()

      await expect(t.services.platformOrgs.addMember('ada-lovelace', grace.id, 'member')).rejects.toThrow(ForbiddenError)
    })
  })
})
