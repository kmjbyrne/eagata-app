import { describe, expect, it } from 'vitest'
import { workspacePermissions } from '../entities/permissions'
import { ForbiddenError, LastOwnerError, NotFoundError, SlugTakenError } from '../errors'
import { companyOrg } from '../testing/companyOrg'
import { createTestServices } from '../testing/createTestServices'

async function setup() {
  const t = createTestServices()
  const ada = await t.addUser('Ada Lovelace')
  const grace = await t.addUser('Grace Hopper')
  const mary = await t.addUser('Mary Somerville')
  const katherine = await t.addUser('Katherine Johnson')
  const { workspaces: [general] } = await companyOrg(t.repositories, {
    name: 'Acme',
    slug: 'acme',
    members: [[ada, 'owner'], [katherine, 'admin'], [grace, 'member']],
    workspaces: ['general', 'finance']
  })
  await t.repositories.workspaceMembers.add({ workspaceId: general!.id, userId: ada.id, role: 'owner' })
  await t.repositories.workspaceMembers.add({ workspaceId: general!.id, userId: grace.id, role: 'viewer' })
  return { t, ada, grace, mary, katherine }
}

describe('WorkspaceAccess.require', () => {
  it('grants org owners and admins owner access to every workspace', async () => {
    const { t, katherine } = await setup()
    t.signInAs(katherine)

    expect((await t.services.workspaceAccess.require('acme', 'finance', 'members.manage')).role).toBe('owner')
  })

  it('grants a workspace member their workspace role', async () => {
    const { t, grace } = await setup()
    t.signInAs(grace)

    expect((await t.services.workspaceAccess.require('acme', 'general')).role).toBe('viewer')
  })

  it('refuses a permission the member\'s role lacks', async () => {
    const { t, grace } = await setup()
    t.signInAs(grace)

    await expect(t.services.workspaceAccess.require('acme', 'general', 'members.manage')).rejects.toThrow(ForbiddenError)
  })

  it('checks an app\'s own permissions', async () => {
    const { t, grace } = await setup()
    const notes = workspacePermissions.extend({ 'notes.read': 'viewer', 'notes.edit': 'editor' })
    t.signInAs(grace)

    expect((await t.services.workspaceAccess.require('acme', 'general', 'notes.read', notes)).role).toBe('viewer')
    await expect(t.services.workspaceAccess.require('acme', 'general', 'notes.edit', notes)).rejects.toThrow(ForbiddenError)
  })

  it('hides workspaces from org members who don\'t belong to them, and from outsiders', async () => {
    const { t, grace, mary } = await setup()
    t.signInAs(grace)
    await expect(t.services.workspaceAccess.require('acme', 'finance')).rejects.toThrow(NotFoundError)
    t.signInAs(mary)
    await expect(t.services.workspaceAccess.require('acme', 'general')).rejects.toThrow(NotFoundError)
    await expect(t.services.workspaceAccess.require('acme', 'nowhere')).rejects.toThrow(NotFoundError)
  })
})

describe('WorkspaceService', () => {
  describe('list', () => {
    it('lists the workspaces the user can see', async () => {
      const { t, grace } = await setup()
      t.signInAs(grace)

      expect((await t.services.workspaces.list('acme')).map(entry => entry.workspace.slug)).toEqual(['general'])
    })
  })

  describe('create', () => {
    it('lets org owners and admins create a workspace, and makes them its owner', async () => {
      const { t, katherine } = await setup()
      t.signInAs(katherine)
      const created = await t.services.workspaces.create('acme', 'Marketing Team')

      expect(created).toMatchObject({ name: 'Marketing Team', slug: 'marketing-team' })
      expect(await t.repositories.workspaceMembers.find(created.id, katherine.id)).toMatchObject({ role: 'owner' })
    })

    it('takes a chosen slug', async () => {
      const { t, ada } = await setup()
      t.signInAs(ada)

      expect((await t.services.workspaces.create('acme', 'Marketing', 'mktg')).slug).toBe('mktg')
    })

    it('refuses plain org members and outsiders', async () => {
      const { t, grace, mary } = await setup()
      t.signInAs(grace)
      await expect(t.services.workspaces.create('acme', 'Mine')).rejects.toThrow(ForbiddenError)
      t.signInAs(mary)
      await expect(t.services.workspaces.create('acme', 'Mine')).rejects.toThrow(NotFoundError)
    })

    it('rejects a slug the org already uses', async () => {
      const { t, ada } = await setup()
      t.signInAs(ada)

      await expect(t.services.workspaces.create('acme', 'General')).rejects.toThrow(SlugTakenError)
    })

    it('lets a user create workspaces in their personal org', async () => {
      const { t, mary } = await setup()
      t.signInAs(mary)

      expect((await t.services.workspaces.create('mary-somerville', 'Holidays')).slug).toBe('holidays')
    })
  })

  describe('members', () => {
    it('invites by email, and the invitation becomes a membership when they next open the app', async () => {
      const { t, ada, mary } = await setup()
      t.signInAs(ada)
      const invitation = await t.services.workspaces.invite('acme', 'general', ' Mary.Somerville@example.com ', 'editor')

      expect(invitation).toMatchObject({ email: mary.email, role: 'editor', invitedBy: ada.id })
      expect((await t.services.workspaces.listMembers('acme', 'general')).invitations.map(entry => [entry.email, entry.role])).toEqual([[mary.email, 'editor']])
      t.signInAs(mary)
      await t.services.orgs.listMine()
      expect((await t.services.workspaceAccess.require('acme', 'general')).role).toBe('editor')
      t.signInAs(ada)
      const { members, invitations } = await t.services.workspaces.listMembers('acme', 'general')
      expect(members.map(member => [member.user.displayName, member.role])).toEqual([['Ada Lovelace', 'owner'], ['Grace Hopper', 'viewer'], ['Mary Somerville', 'editor']])
      expect(invitations).toEqual([])
    })

    it('answers the same for an email with no account, and someone already a member, revealing neither', async () => {
      const { t, ada, grace } = await setup()
      t.signInAs(ada)

      expect(await t.services.workspaces.invite('acme', 'general', 'nobody@example.com', 'viewer')).toMatchObject({ email: 'nobody@example.com', role: 'viewer' })
      expect(await t.services.workspaces.invite('acme', 'general', grace.email, 'editor')).toMatchObject({ email: grace.email, role: 'editor' })
    })

    it('keeps an existing membership as it is when its member accepts an invitation', async () => {
      const { t, ada, grace } = await setup()
      t.signInAs(ada)
      await t.services.workspaces.invite('acme', 'general', grace.email, 'owner')
      t.signInAs(grace)
      await t.services.orgs.listMine()

      expect((await t.services.workspaceAccess.require('acme', 'general')).role).toBe('viewer')
    })

    it('waits for an account that doesn\'t exist yet, and applies once it does', async () => {
      const { t, ada } = await setup()
      t.signInAs(ada)
      await t.services.workspaces.invite('acme', 'general', 'newcomer@example.com', 'viewer')
      const newcomer = await t.addUser('New Comer', { email: 'newcomer@example.com' })
      t.signInAs(newcomer)
      await t.services.orgs.listMine()

      expect((await t.services.workspaceAccess.require('acme', 'general')).role).toBe('viewer')
    })

    it('cancels an invitation', async () => {
      const { t, ada, mary } = await setup()
      t.signInAs(ada)
      await t.services.workspaces.invite('acme', 'general', mary.email, 'editor')
      await t.services.workspaces.cancelInvitation('acme', 'general', mary.email)
      t.signInAs(mary)
      await t.services.orgs.listMine()

      await expect(t.services.workspaceAccess.require('acme', 'general')).rejects.toThrow(NotFoundError)
    })

    it('lets only workspace owners add, change and remove members', async () => {
      const { t, ada, grace, mary } = await setup()
      t.signInAs(grace)

      await expect(t.services.workspaces.invite('acme', 'general', mary.email, 'viewer')).rejects.toThrow(ForbiddenError)
      await expect(t.services.workspaces.cancelInvitation('acme', 'general', mary.email)).rejects.toThrow(ForbiddenError)
      await expect(t.services.workspaces.changeMemberRole('acme', 'general', ada.id, 'viewer')).rejects.toThrow(ForbiddenError)
      await expect(t.services.workspaces.removeMember('acme', 'general', ada.id)).rejects.toThrow(ForbiddenError)
    })

    it('changes a member\'s role', async () => {
      const { t, ada, grace } = await setup()
      t.signInAs(ada)
      await t.services.workspaces.changeMemberRole('acme', 'general', grace.id, 'editor')

      expect(await t.repositories.workspaceMembers.find((await t.services.workspaceAccess.require('acme', 'general')).workspace.id, grace.id))
        .toMatchObject({ role: 'editor' })
    })

    it('keeps at least one workspace owner', async () => {
      const { t, ada } = await setup()
      t.signInAs(ada)

      await expect(t.services.workspaces.changeMemberRole('acme', 'general', ada.id, 'editor')).rejects.toThrow(LastOwnerError)
      await expect(t.services.workspaces.removeMember('acme', 'general', ada.id)).rejects.toThrow(LastOwnerError)
    })

    it('lets a member leave', async () => {
      const { t, grace } = await setup()
      t.signInAs(grace)
      await t.services.workspaces.removeMember('acme', 'general', grace.id)

      await expect(t.services.workspaceAccess.require('acme', 'general')).rejects.toThrow(NotFoundError)
    })
  })
})
