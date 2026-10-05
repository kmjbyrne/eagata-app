import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { defineCollections } from './collections'
import { contractCollections, jsonStoreContract } from './contract'
import { FileJsonStore } from './FileJsonStore'

const root = await mkdtemp(join(tmpdir(), 'json-store-'))
let count = 0
const newFile = () => join(root, `${++count}`, 'store.json')
const open = (file: string) => new FileJsonStore({ file, collections: contractCollections })

afterAll(() => rm(root, { recursive: true, force: true }))

describe('FileJsonStore', () => {
  jsonStoreContract(async (collections, contents) => {
    const file = newFile()
    if (contents) {
      await mkdir(join(file, '..'), { recursive: true })
      await writeFile(file, JSON.stringify(contents))
    }
    return new FileJsonStore({ file, collections })
  })

  it('writes the file with _meta first and every collection as a list', async () => {
    const file = newFile()
    await open(file).put('people', { id: 'p1', name: 'Ada' })

    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({
      _meta: { version: 1, seededAt: null },
      notes: [],
      people: [{ id: 'p1', name: 'Ada' }]
    })
  })

  it('reads back what an earlier store wrote', async () => {
    const file = newFile()
    await open(file).put('people', { id: 'p1', name: 'Ada' })

    expect(await open(file).get('people', 'p1')).toEqual({ id: 'p1', name: 'Ada' })
  })

  it('keeps keys that no collection defines', async () => {
    const file = newFile()
    await open(file).put('people', { id: 'p1', name: 'Ada' })
    const written = JSON.parse(await readFile(file, 'utf8'))
    await writeFile(file, JSON.stringify({ ...written, retired: [{ id: 'r1' }] }))
    await open(file).put('people', { id: 'p2', name: 'Grace' })

    expect(JSON.parse(await readFile(file, 'utf8')).retired).toEqual([{ id: 'r1' }])
  })

  it('keeps neither the file nor memory changed when the file cannot be written', async () => {
    const file = newFile()
    const store = open(file)
    await store.put('people', { id: 'p1', name: 'Ada' })
    const directory = join(file, '..')
    await chmod(directory, 0o500)
    try {
      await expect(store.put('people', { id: 'p2', name: 'Grace' })).rejects.toThrow()
    } finally {
      await chmod(directory, 0o700)
    }

    expect(await store.get('people', 'p2')).toBeNull()
    expect(JSON.parse(await readFile(file, 'utf8')).people).toHaveLength(1)
  })

  it('writes seeds to the file on first use, and keeps when it seeded', async () => {
    const file = newFile()
    const seeded = defineCollections({
      people: { schema: z.object({ id: z.string(), name: z.string() }), seed: () => [{ id: 'p1', name: 'Ada' }] }
    })
    await new FileJsonStore({ file, collections: seeded }).find('people')
    const written = JSON.parse(await readFile(file, 'utf8'))

    expect(written.people).toEqual([{ id: 'p1', name: 'Ada' }])
    expect((await new FileJsonStore({ file, collections: seeded }).status()).seededAt).toBe(written._meta.seededAt)
  })

  it('keeps a drifted collection in the file until a reset', async () => {
    const file = newFile()
    await mkdir(join(file, '..'), { recursive: true })
    await writeFile(file, JSON.stringify({ notes: [{ id: 'n1', title: 42 }] }))
    const store = open(file)
    await store.put('people', { id: 'p1', name: 'Ada' })

    expect(JSON.parse(await readFile(file, 'utf8')).notes).toEqual([{ id: 'n1', title: 42 }])

    await store.reset()

    expect(JSON.parse(await readFile(file, 'utf8')).notes).toEqual([])
  })
})
