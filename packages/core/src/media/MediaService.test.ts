import { describe, expect, it, vi } from 'vitest'
import { NotFoundError, NotSignedInError } from '../errors'
import { companyOrg } from '../testing/companyOrg'
import { createTestServices } from '../testing/createTestServices'
import { InMemoryMediaStorage } from '../testing/InMemoryMediaStorage'
import { MediaService, MediaTooLargeError, UnsupportedMediaError } from './MediaService'
import { PNG_BYTES } from './testing'

const bytes = (value: Uint8Array) => async () => value

async function setup() {
  const t = createTestServices()
  const storage = new InMemoryMediaStorage()
  const media = new MediaService({ repositories: t.repositories, currentUser: t.currentUser, access: t.services.workspaceAccess, storage, now: () => new Date('2026-06-15T00:00:00Z') })
  const ada = await t.addUser('Ada Lovelace')
  const grace = await t.addUser('Grace Hopper')
  const alan = await t.addUser('Alan Turing')
  const pat = await t.addUser('Pat Platform', { platformAdmin: true })
  const { workspaces: [general] } = await companyOrg(t.repositories, { name: 'Acme', slug: 'acme', members: [[ada, 'owner'], [grace, 'member']] })
  await t.repositories.workspaceMembers.add({ workspaceId: general!.id, userId: grace.id, role: 'viewer' })
  return { t, media, storage, ada, grace, alan, pat, general: general! }
}

describe('MediaService.upload', () => {
  it('stores an image under its workspace, typed by its bytes, for any member', async () => {
    const { t, media, storage, grace, general } = await setup()
    t.signInAs(grace)
    const stored = await media.upload('acme', 'general', bytes(PNG_BYTES))

    expect(stored.key).toMatch(new RegExp(`^workspaces/${general.id}/2026/06/[0-9a-f-]{36}\\.png$`))
    expect(stored.src).toBe(`/media/${stored.key}`)
    expect(storage.files.get(stored.key)?.contentType).toBe('image/png')
  })

  it('refuses anything but an image, and anything over 15 MB', async () => {
    const { t, media, ada } = await setup()
    t.signInAs(ada)

    await expect(media.upload('acme', 'general', bytes(new TextEncoder().encode('<svg onload="x">')))).rejects.toThrow(UnsupportedMediaError)
    await expect(media.upload('acme', 'general', bytes(new Uint8Array(15 * 1024 * 1024 + 1)))).rejects.toThrow(MediaTooLargeError)
  })

  it('hides the workspace from outsiders, without reading their upload', async () => {
    const { t, media, alan } = await setup()
    t.signInAs(alan)
    const read = vi.fn(bytes(PNG_BYTES))

    await expect(media.upload('acme', 'general', read)).rejects.toThrow(NotFoundError)
    expect(read).not.toHaveBeenCalled()
  })
})

describe('MediaService.read', () => {
  it('serves an image to the workspace\'s people and to platform admins, and to nobody else', async () => {
    const { t, media, ada, grace, alan, pat } = await setup()
    t.signInAs(grace)
    const { key } = await media.upload('acme', 'general', bytes(PNG_BYTES))

    for (const allowed of [grace, ada, pat]) {
      t.signInAs(allowed)
      expect(await media.read(key)).toEqual({ bytes: PNG_BYTES, contentType: 'image/png' })
    }
    t.signInAs(alan)
    await expect(media.read(key)).rejects.toThrow(NotFoundError)
    t.signOut()
    await expect(media.read(key)).rejects.toThrow(NotSignedInError)
  })

  it('answers not found for a malformed or missing key alike', async () => {
    const { t, media, pat, general } = await setup()
    t.signInAs(pat)

    await expect(media.read('../../etc/passwd')).rejects.toThrow(NotFoundError)
    await expect(media.read(`workspaces/${general.id}/2026/06/00000000-0000-0000-0000-000000000000.png`)).rejects.toThrow(NotFoundError)
  })
})

describe('a person\'s own images', () => {
  it('serves them to their owner and platform admins only', async () => {
    const { t, media, ada, grace, pat } = await setup()
    t.signInAs(ada)
    const { key } = await media.uploadForMe(bytes(PNG_BYTES))

    expect(key).toMatch(new RegExp(`^users/${ada.id}/`))
    for (const allowed of [ada, pat]) {
      t.signInAs(allowed)
      expect((await media.read(key)).contentType).toBe('image/png')
    }
    t.signInAs(grace)
    await expect(media.read(key)).rejects.toThrow(NotFoundError)
  })

  it('needs someone signed in, before reading the upload', async () => {
    const { t, media } = await setup()
    t.signOut()
    const read = vi.fn(bytes(PNG_BYTES))

    await expect(media.uploadForMe(read)).rejects.toThrow(NotSignedInError)
    expect(read).not.toHaveBeenCalled()
  })
})
