import { createCoreServices, parseEmail, parseName, parseOrgSlug, parseSlug, type UserId } from '@kmjbyrne/core'
import { FakeCurrentUser, SequentialIdGenerator } from '@kmjbyrne/core/testing'
import { MemoryJsonStore } from '@kmjbyrne/json-store'
import { describe, expect, it } from 'vitest'
import { tenancyCollections } from './collections'
import { tenancyDevUsers } from './devUsers'
import { defaultTenancyFixtures } from './fixtures'
import { JsonStoreRepositories } from './JsonStoreRepositories'

function world() {
  const store = new MemoryJsonStore(tenancyCollections())
  const currentUser = new FakeCurrentUser()
  const services = createCoreServices({ repositories: new JsonStoreRepositories(store), currentUser, ids: new SequentialIdGenerator() })
  const as = (key: string) => currentUser.signInAs(`user-${key}` as UserId)
  return { store, services, as }
}

const reach = async (services: ReturnType<typeof world>['services']) =>
  (await services.orgs.listMine()).map(entry => [entry.org.slug, entry.role, entry.workspaces.map(workspace => `${workspace.workspace.slug}:${workspace.role}`)])

describe('defaultTenancyFixtures', () => {
  const fixtures = defaultTenancyFixtures()

  it('holds only values the domain accepts', () => {
    for (const user of fixtures.users) {
      expect(parseEmail(user.email)).toBe(user.email)
      expect(parseName(user.displayName)).toBe(user.displayName)
    }
    for (const org of fixtures.orgs) {
      expect(parseOrgSlug(org.slug)).toBe(org.slug)
      org.previousSlugs.forEach(slug => expect(parseOrgSlug(slug)).toBe(slug))
    }
    fixtures.workspaces.forEach(workspace => expect(parseSlug(workspace.slug)).toBe(workspace.slug))
  })

  it('gives every user a personal org they own, with a General workspace they own', () => {
    for (const user of fixtures.users) {
      const personal = fixtures.memberships.filter(membership =>
        membership.userId === user.id && fixtures.orgs.find(org => org.id === membership.orgId)?.isPersonal)
      expect(personal.map(membership => membership.role)).toEqual(['owner'])
      const general = fixtures.workspaces.find(workspace => workspace.orgId === personal[0]!.orgId && workspace.slug === 'general')!
      expect(fixtures.workspaceMembers.find(member => member.workspaceId === general.id && member.userId === user.id)?.role).toBe('owner')
    }
  })

  it('gives every org an owner, and every personal org one member only', () => {
    for (const org of fixtures.orgs) {
      const members = fixtures.memberships.filter(membership => membership.orgId === org.id)
      expect(members.some(membership => membership.role === 'owner')).toBe(true)
      if (org.isPersonal) {
        expect(members).toHaveLength(1)
      }
    }
  })

  it('plays out as described', async () => {
    const { services, as } = world()

    as('pat')
    expect((await services.users.getMe()).platformRole?.role).toBe('admin')
    expect(await reach(services)).toEqual([['pat-platform', 'owner', ['general:owner']]])

    as('grace')
    expect(await reach(services)).toEqual([
      ['grace-hopper', 'owner', ['general:owner']],
      ['acme', 'admin', ['general:owner', 'finance:owner']],
      ['globex', 'member', ['general:editor']]
    ])

    as('alan')
    expect((await reach(services))[1]).toEqual(['acme', 'member', ['finance:viewer']])

    as('mary')
    expect(await reach(services)).toEqual([['mary-somerville', 'owner', ['general:owner']], ['ada-lovelace', null, ['general:editor']]])
    expect(await services.orgs.home()).toBeNull()

    as('ada')
    expect(await services.orgs.resolveSlug('acme-old')).toBe('acme')

    as('dana')
    await expect(services.orgs.listMine()).rejects.toThrow('Sign in required')
  })
})

describe('tenancyDevUsers', () => {
  it('lists everyone with their company roles', async () => {
    const users = await tenancyDevUsers(world().store)

    expect(users.map(user => [user.name, user.description])).toEqual([
      ['Ada Lovelace', 'owner of Acme Ltd'],
      ['Alan Turing', 'member of Acme Ltd'],
      ['Dana Deactivated', 'Deactivated, member of Acme Ltd'],
      ['Grace Hopper', 'admin of Acme Ltd, member of Globex Corporation'],
      ['Katherine Johnson', 'owner of Globex Corporation'],
      ['Mary Somerville', 'Personal org only'],
      ['Pat Platform', 'Platform admin']
    ])
  })
})
