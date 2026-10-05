import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { defineCollections, type DocumentsOf } from './collections'
import { InvalidDocumentError, NestedWriteError, UnknownCollectionError, type JsonStore } from './JsonStore'

export const contractCollections = defineCollections({
  notes: { schema: z.object({ id: z.string(), title: z.string(), tags: z.array(z.string()).default([]) }) },
  people: { schema: z.object({ id: z.string(), name: z.string() }) }
})

export type ContractCollections = typeof contractCollections
export type ContractStore = JsonStore<DocumentsOf<ContractCollections>>

const note = (id: string, title = `Note ${id}`) => ({ id, title, tags: [] as string[] })

/**
 * The behaviour every JsonStore must have. Call it from a test file with a
 * function that makes a new, empty store over `contractCollections`.
 */
export function jsonStoreContract(createStore: () => ContractStore | Promise<ContractStore>): void {
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
}
