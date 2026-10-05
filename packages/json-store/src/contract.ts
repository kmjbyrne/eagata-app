import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { defineCollections, type CollectionDefinitions, type DocumentsOf } from './collections'
import {
  DriftedCollectionError,
  InvalidDocumentError,
  NestedWriteError,
  UnknownCollectionError,
  type SeededJsonStore
} from './JsonStore'

export const contractCollections = defineCollections({
  notes: { schema: z.object({ id: z.string(), title: z.string(), tags: z.array(z.string()).default([]) }) },
  people: { schema: z.object({ id: z.string(), name: z.string() }) }
})

const seededCollections = defineCollections({
  ...contractCollections,
  people: { ...contractCollections.people, seed: () => [{ id: 'p1', name: 'Ada' }, { id: 'p2', name: 'Grace' }] }
})

/**
 * Makes a new store over `collections`. `contents` stands in for data the
 * store finds at startup, unchecked, keyed by collection name.
 */
export type CreateStore = <C extends CollectionDefinitions>(
  collections: C,
  contents?: Record<string, unknown>
) => SeededJsonStore<DocumentsOf<C>> | Promise<SeededJsonStore<DocumentsOf<C>>>

const note = (id: string, title = `Note ${id}`) => ({ id, title, tags: [] as string[] })

/** The behaviour every store must have. Call it from a test file. */
export function jsonStoreContract(create: CreateStore): void {
  const createStore = () => create(contractCollections)

  describe('reading and writing', () => {
    it('returns null for a missing document', async () => {
      const store = await createStore()

      expect(await store.get('notes', 'missing')).toBeNull()
    })

    it('returns what was put, with schema defaults applied', async () => {
      const store = await createStore()
      await store.put('notes', { id: 'n1', title: 'First' } as never)

      expect(await store.get('notes', 'n1')).toEqual({ id: 'n1', title: 'First', tags: [] })
    })

    it('replaces a document with the same id in place', async () => {
      const store = await createStore()
      await store.put('notes', note('n1'))
      await store.put('notes', note('n2'))
      await store.put('notes', note('n1', 'Changed'))

      expect((await store.find('notes')).map(found => found.title)).toEqual(['Changed', 'Note n2'])
    })

    it('finds every document in order, or those matching a predicate', async () => {
      const store = await createStore()
      await store.put('notes', note('n1'))
      await store.put('notes', note('n2'))
      await store.put('notes', note('n3'))

      expect((await store.find('notes')).map(found => found.id)).toEqual(['n1', 'n2', 'n3'])
      expect((await store.find('notes', found => found.id !== 'n2')).map(found => found.id)).toEqual(['n1', 'n3'])
    })

    it('keeps collections apart', async () => {
      const store = await createStore()
      await store.put('notes', note('same'))

      expect(await store.get('people', 'same')).toBeNull()
    })

    it('deletes, and says whether there was anything to delete', async () => {
      const store = await createStore()
      await store.put('notes', note('n1'))

      expect(await store.delete('notes', 'n1')).toBe(true)
      expect(await store.delete('notes', 'n1')).toBe(false)
      expect(await store.get('notes', 'n1')).toBeNull()
    })

    it('stores copies, so mutating an object never changes stored data', async () => {
      const store = await createStore()
      const input = note('n1')
      await store.put('notes', input)
      input.tags.push('mutated')
      const output = (await store.get('notes', 'n1'))!
      output.tags.push('mutated')

      expect(await store.get('notes', 'n1')).toEqual(note('n1'))
    })

    it('rejects an unknown collection', async () => {
      const store = await createStore()

      await expect(store.get('nope' as 'notes', 'n1')).rejects.toThrow(UnknownCollectionError)
      await expect(store.put('nope' as 'notes', note('n1'))).rejects.toThrow(UnknownCollectionError)
    })

    it('rejects a document that fails its schema, and stores nothing', async () => {
      const store = await createStore()

      await expect(store.put('notes', { id: 'n1', title: 42 } as never)).rejects.toThrow(InvalidDocumentError)
      expect(await store.find('notes')).toEqual([])
    })

    it('loses no write when many run at once', async () => {
      const store = await createStore()
      await Promise.all(Array.from({ length: 20 }, (_, index) => store.put('notes', note(`n${index}`))))

      expect(await store.find('notes')).toHaveLength(20)
    })
  })

  describe('transactions', () => {
    it('keeps every write when the callback resolves, and returns its value', async () => {
      const store = await createStore()
      const result = await store.transaction(async (tx) => {
        await tx.put('notes', note('n1'))
        await tx.put('people', { id: 'p1', name: 'Ada' })
        return 'done'
      })

      expect(result).toBe('done')
      expect(await store.get('notes', 'n1')).not.toBeNull()
      expect(await store.get('people', 'p1')).not.toBeNull()
    })

    it('keeps no write when the callback throws', async () => {
      const store = await createStore()
      await store.put('notes', note('n1'))

      await expect(store.transaction(async (tx) => {
        await tx.delete('notes', 'n1')
        await tx.put('people', { id: 'p1', name: 'Ada' })
        throw new Error('changed my mind')
      })).rejects.toThrow('changed my mind')
      expect(await store.get('notes', 'n1')).not.toBeNull()
      expect(await store.get('people', 'p1')).toBeNull()
    })

    it('sees its own writes before they are kept', async () => {
      const store = await createStore()

      await store.transaction(async (tx) => {
        await tx.put('notes', note('n1'))
        expect(await tx.get('notes', 'n1')).not.toBeNull()
        expect(await store.get('notes', 'n1')).toBeNull()
      })
    })

    it('joins a nested transaction into the outer one', async () => {
      const store = await createStore()

      await expect(store.transaction(async (tx) => {
        await tx.transaction(inner => inner.put('notes', note('n1')))
        throw new Error('roll back both')
      })).rejects.toThrow()
      expect(await store.get('notes', 'n1')).toBeNull()
    })

    it('refuses a write through the outer store from inside, instead of deadlocking', async () => {
      const store = await createStore()

      await expect(store.transaction(() => store.put('notes', note('n1')))).rejects.toThrow(NestedWriteError)
    })
  })

  describe('seeding and drift', () => {
    it('seeds a missing or empty collection, and reports when', async () => {
      const store = await create(seededCollections, { people: [] })

      expect((await store.find('people')).map(person => person.name)).toEqual(['Ada', 'Grace'])
      expect((await store.status()).seededAt).toEqual(expect.any(String))
    })

    it('leaves a collection that has documents alone', async () => {
      const store = await create(seededCollections, { people: [{ id: 'p9', name: 'Mary' }] })

      expect((await store.find('people')).map(person => person.name)).toEqual(['Mary'])
    })

    it('reports a collection that fails its schema instead of throwing', async () => {
      const store = await create(seededCollections, { notes: [{ id: 'n1', title: 42 }] })

      expect((await store.status()).drifted).toEqual([
        { collection: 'notes', issues: [expect.stringContaining('[0] title')] }
      ])
      await expect(store.find('notes')).rejects.toThrow(DriftedCollectionError)
      await expect(store.put('notes', note('n2'))).rejects.toThrow(DriftedCollectionError)
      expect(await store.find('people')).toHaveLength(2)
    })

    it('reports a collection that is not a list', async () => {
      const store = await create(seededCollections, { notes: { id: 'n1' } })

      expect((await store.status()).drifted.map(report => report.collection)).toEqual(['notes'])
    })

    it('resets every collection to its seed and clears drift', async () => {
      const store = await create(seededCollections, { notes: [{ id: 'n1', title: 42 }] })
      await store.put('people', { id: 'p3', name: 'Katherine' })
      await store.reset()

      expect((await store.status()).drifted).toEqual([])
      expect(await store.find('notes')).toEqual([])
      expect((await store.find('people')).map(person => person.id)).toEqual(['p1', 'p2'])
    })

    it('rejects a seed that fails its schema', async () => {
      const broken = defineCollections({
        people: { schema: contractCollections.people.schema, seed: () => [{ id: 'p1' } as never] }
      })
      const store = await create(broken)

      await expect(store.find('people')).rejects.toThrow(InvalidDocumentError)
    })
  })
}
