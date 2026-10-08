import { describe, expect, it } from 'vitest'
import { InvalidInputError, LastPlatformAdminError, NotSignedInError } from '../errors'
import { createTestServices } from '../testing/createTestServices'

describe('UserService.signOutEverywhere', () => {
  it('ends every session the user has, and no one else\'s', async () => {
    const t = createTestServices()
    const ada = await t.addUser('Ada Lovelace')
    const grace = await t.addUser('Grace Hopper')
    t.signInAs(ada)
    await t.services.users.signOutEverywhere()

    await expect(t.services.users.getMe()).rejects.toThrow(NotSignedInError)
    t.signInAs((await t.repositories.users.findById(ada.id))!)
    expect((await t.services.users.getMe()).id).toBe(ada.id)
    t.signInAs(grace)
    expect((await t.services.users.getMe()).id).toBe(grace.id)
  })

  it('needs a signed-in user', async () => {
    await expect(createTestServices().services.users.signOutEverywhere()).rejects.toThrow(NotSignedInError)
  })
})

describe('UserService.deactivateMe', () => {
  it('deactivates the signed-in user, who then can\'t act', async () => {
    const t = createTestServices()
    const ada = await t.addUser('Ada Lovelace')
    t.signInAs(ada)
    await t.services.users.deactivateMe(' Ada.Lovelace@example.com ')

    expect((await t.repositories.users.findById(ada.id))?.deactivatedAt).toBeInstanceOf(Date)
    await expect(t.services.orgs.listMine()).rejects.toThrow(NotSignedInError)
  })

  it('needs the user\'s own email to confirm', async () => {
    const t = createTestServices()
    const ada = await t.addUser('Ada Lovelace')
    t.signInAs(ada)

    await expect(t.services.users.deactivateMe('someone@example.com')).rejects.toThrow(InvalidInputError)
    expect((await t.repositories.users.findById(ada.id))?.deactivatedAt).toBeNull()
  })

  it('keeps the last active platform admin', async () => {
    const t = createTestServices()
    const pat = await t.addUser('Pat Platform', { platformAdmin: true })
    t.signInAs(pat)

    await expect(t.services.users.deactivateMe(pat.email)).rejects.toThrow(LastPlatformAdminError)
  })

  it('needs a signed-in user', async () => {
    await expect(createTestServices().services.users.deactivateMe('x@example.com')).rejects.toThrow(NotSignedInError)
  })
})
