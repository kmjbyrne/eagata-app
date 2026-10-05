import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseMediaKey, type MediaKey } from '@kmjbyrne/core/media'
import { afterAll, describe, expect, it } from 'vitest'
import { LocalDiskMediaStorage } from './LocalDiskMediaStorage'

describe('LocalDiskMediaStorage', async () => {
  const root = await mkdtemp(join(tmpdir(), 'media-'))
  const storage = new LocalDiskMediaStorage(root)
  afterAll(() => rm(root, { recursive: true, force: true }))
  const key = parseMediaKey('workspaces/ws-1/2026/06/0b9e6a4e-6f4a-4c1e-9d55-3f1f2a6b7c8d.png')

  it('stores bytes under the key and reads them back', async () => {
    await storage.put(key, new Uint8Array([1, 2, 3]), 'image/png')

    expect(await storage.get(key)).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('never overwrites a stored file', async () => {
    await expect(storage.put(key, new Uint8Array([9]), 'image/png')).rejects.toThrow()
  })

  it('answers null for a missing file', async () => {
    expect(await storage.get(parseMediaKey('workspaces/ws-1/2026/06/00000000-0000-0000-0000-000000000000.png'))).toBeNull()
  })

  it('refuses a key that escapes the root, even one that skipped parsing', async () => {
    await expect(storage.get('../../etc/passwd' as MediaKey)).rejects.toThrow('escapes')
  })
})
