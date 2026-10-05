import { describe, expect, it } from 'vitest'
import { NotFoundError, NotSignedInError } from '../errors'
import { companyOrg } from '../testing/companyOrg'
import { createTestServices } from '../testing/createTestServices'

async function setup() {
  const t = createTestServices()
  const ada = await t.signUp('Ada Lovelace')
  const grace = await t.signUp('Grace Hopper')
  const mary = await t.signUp('Mary Somerville')
  const { workspaces: [general, finance] } = await companyOrg(t.store, {
    name: 'Acme',
    slug: 'acme',
    previousSlugs: ['acme-old'],
    members: [[ada, 'owner'], [grace, 'member']],
    workspaces: ['general', 'finance']
  })
  await t.store.workspaceMembers.add({ workspaceId: general!.id, userId: grace.id, role: 'editor' })
  return { t, ada, grace, mary, general: general!, finance: finance! }
}

describe('OrgService', () => {
  describe('listMine', () => {
    it('lists the personal org first, then the rest by name, with the role in each', async () => {
      const { t, ada } = await setup()
      t.signInAs(ada)
      const orgs = await t.services.orgs.listMine()

      expect(orgs.map(entry => [entry.org.slug, entry.role])).toEqual([['ada-lovelace', 'owner'], ['acme', 'owner']])
    })

    it('shows org owners every workspace, and plain members only those they belong to', async () => {
      const { t, ada, grace } = await setup()
      t.signInAs(ada)
      const forAda = (await t.services.orgs.listMine()).find(entry => entry.org.slug === 'acme')!
      t.signInAs(grace)
      const forGrace = (await t.services.orgs.listMine()).find(entry => entry.org.slug === 'acme')!

      expect(forAda.workspaces.map(entry => [entry.workspace.slug, entry.role])).toEqual([['general', 'owner'], ['finance', 'owner']])
      expect(forGrace.workspaces.map(entry => [entry.workspace.slug, entry.role])).toEqual([['general', 'editor']])
    })

    it('includes an org the user reaches only through a shared workspace', async () => {
      const { t, ada, mary } = await setup()
      t.signInAs(ada)
      const personal = (await t.services.orgs.listMine())[0]!
      await t.services.workspaces.addMember(personal.org.slug, 'general', mary.email, 'viewer')
      t.signInAs(mary)

      expect((await t.services.orgs.listMine()).map(entry => [entry.org.slug, entry.role, entry.workspaces.length]))
        .toEqual([['mary-somerville', 'owner', 1], ['ada-lovelace', null, 1]])
    })

    it('requires a signed-in user', async () => {
      const { t } = await setup()

      await expect(t.services.orgs.listMine()).rejects.toThrow(NotSignedInError)
    })
  })

  describe('getBySlug', () => {
    it('returns an org the user can reach', async () => {
      const { t, grace } = await setup()
      t.signInAs(grace)

      expect((await t.services.orgs.getBySlug('acme')).role).toBe('member')
    })

    it('hides an org from anyone who can\'t reach it, and doesn\'t accept old slugs', async () => {
      const { t, ada, mary } = await setup()
      t.signInAs(mary)
      await expect(t.services.orgs.getBySlug('acme')).rejects.toThrow(NotFoundError)
      t.signInAs(ada)
      await expect(t.services.orgs.getBySlug('acme-old')).rejects.toThrow(NotFoundError)
      await expect(t.services.orgs.getBySlug('Not A Slug!')).rejects.toThrow(NotFoundError)
    })
  })

  describe('resolveSlug', () => {
    it('gives the current slug for an old one', async () => {
      const { t, grace } = await setup()
      t.signInAs(grace)

      expect(await t.services.orgs.resolveSlug('acme-old')).toBe('acme')
    })

    it('hides the redirect from anyone who can\'t reach the org', async () => {
      const { t, mary } = await setup()
      t.signInAs(mary)

      await expect(t.services.orgs.resolveSlug('acme-old')).rejects.toThrow(NotFoundError)
      await expect(t.services.orgs.resolveSlug('nowhere')).rejects.toThrow(NotFoundError)
    })
  })
})

describe('UserService.getMe', () => {
  it('returns the signed-in user', async () => {
    const { t, ada } = await setup()
    t.signInAs(ada)

    expect((await t.services.users.getMe()).id).toBe(ada.id)
  })

  it('requires a signed-in user', async () => {
    const { t } = await setup()

    await expect(t.services.users.getMe()).rejects.toThrow(NotSignedInError)
  })
})
