import { describe, expect, it } from 'vitest'
import { ForbiddenError, NotFoundError, NotSignedInError } from '../errors'
import { createTestServices } from '../testing/createTestServices'

async function setup() {
  const t = createTestServices({ features: ['progressBoard', 'reports'] })
  const admin = await t.addUser('Pat Platform', { platformAdmin: true })
  const ada = await t.addUser('Ada Lovelace')
  t.signInAs(admin)
  const acme = await t.services.platformOrgs.create('Acme Ltd', ada.id)
  const globex = await t.services.platformOrgs.create('Globex', ada.id)
  return { t, admin, ada, acme, globex }
}

describe('feature flags', () => {
  it('starts every org with every flag off', async () => {
    const { t, ada, acme } = await setup()
    t.signInAs(ada)

    expect((await t.services.orgs.getBySlug(acme.slug)).features).toEqual([])
    await expect(t.services.features.require(acme.slug, 'progressBoard')).rejects.toThrow(NotFoundError)
  })

  it('switches a flag on for one org only, and off again', async () => {
    const { t, admin, ada, acme, globex } = await setup()
    await t.services.platformOrgs.enableFeature(acme.slug, 'progressBoard')
    t.signInAs(ada)

    expect((await t.services.orgs.listMine()).map(entry => [entry.org.slug, entry.features]))
      .toEqual(expect.arrayContaining([[acme.slug, ['progressBoard']], [globex.slug, []]]))
    await expect(t.services.features.require(acme.slug, 'progressBoard')).resolves.toBeUndefined()
    await expect(t.services.features.require(globex.slug, 'progressBoard')).rejects.toThrow(NotFoundError)

    t.signInAs(admin)
    await t.services.platformOrgs.disableFeature(acme.slug, 'progressBoard')
    await expect(t.services.features.require(acme.slug, 'progressBoard')).rejects.toThrow(NotFoundError)
  })

  it('answers an unknown org as not found, like an org without the feature', async () => {
    const { t } = await setup()

    await expect(t.services.features.require('nowhere', 'progressBoard')).rejects.toThrow(NotFoundError)
    await expect(t.services.features.require('Not A Slug!', 'progressBoard')).rejects.toThrow(NotFoundError)
  })

  it('lists features in catalog order, and ignores rows for names the catalog no longer has', async () => {
    const { t, ada, acme } = await setup()
    await t.services.platformOrgs.enableFeature(acme.slug, 'reports')
    await t.services.platformOrgs.enableFeature(acme.slug, 'progressBoard')
    await t.repositories.orgFeatures.enable({ orgId: acme.id, feature: 'retired', enabledAt: new Date(), enabledBy: null })
    t.signInAs(ada)

    expect((await t.services.orgs.getBySlug(acme.slug)).features).toEqual(['progressBoard', 'reports'])
    await expect(t.services.features.require(acme.slug, 'retired')).rejects.toThrow(NotFoundError)
  })

  it('shows platform admins every flag, with who switched it on and when', async () => {
    const { t, admin, acme } = await setup()
    await t.services.platformOrgs.enableFeature(acme.slug, 'progressBoard')
    await t.services.platformOrgs.enableFeature(acme.slug, 'progressBoard')
    const { features } = await t.services.platformOrgs.get(acme.slug)

    expect(features.map(entry => [entry.feature, entry.enabledBy?.id ?? null, entry.enabledAt instanceof Date]))
      .toEqual([['progressBoard', admin.id, true], ['reports', null, false]])
  })

  it('refuses a flag outside the catalog, and anyone but platform admins', async () => {
    const { t, ada, acme } = await setup()

    await expect(t.services.platformOrgs.enableFeature(acme.slug, 'madeUp')).rejects.toThrow(NotFoundError)
    await expect(t.services.platformOrgs.disableFeature(acme.slug, 'madeUp')).rejects.toThrow(NotFoundError)
    await expect(t.services.platformOrgs.enableFeature('nowhere', 'progressBoard')).rejects.toThrow(NotFoundError)
    t.signInAs(ada)
    await expect(t.services.platformOrgs.enableFeature(acme.slug, 'progressBoard')).rejects.toThrow(ForbiddenError)
    await expect(t.services.platformOrgs.disableFeature(acme.slug, 'progressBoard')).rejects.toThrow(ForbiddenError)
    t.signOut()
    await expect(t.services.platformOrgs.enableFeature(acme.slug, 'progressBoard')).rejects.toThrow(NotSignedInError)
  })
})
