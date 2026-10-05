import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { contractCollections, jsonStoreContract } from './contract'
import { FileJsonStore } from './FileJsonStore'

const root = await mkdtemp(join(tmpdir(), 'json-store-'))
let count = 0
const newFile = () => join(root, `${++count}`, 'store.json')
const open = (file: string) => new FileJsonStore({ file, collections: contractCollections })

afterAll(() => rm(root, { recursive: true, force: true }))

describe('FileJsonStore', () => {
  jsonStoreContract(() => open(newFile()))

  it('writes the file with _meta first and a collection per key', async () => {
    const file = newFile()
    await open(file).put('people', { id: 'p1', name: 'Ada' })

    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({
      _meta: { version: 1 },
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
})
