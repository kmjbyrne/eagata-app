import { AsyncLocalStorage } from 'node:async_hooks'
import type { CollectionDefinitions, DocumentsOf, JsonDocument } from './collections'
import { InvalidDocumentError, NestedWriteError, UnknownCollectionError, type JsonStore } from './JsonStore'

export type CollectionData = Record<string, JsonDocument[]>

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))

/**
 * The shared engine of both stores: data held in memory, every write made on
 * a copy and kept only once `persist` succeeds, and writes queued one at a
 * time so concurrent callers never lose each other's changes.
 */
export abstract class SnapshotStore<C extends CollectionDefinitions> implements JsonStore<DocumentsOf<C>> {
  protected data: CollectionData = {}
  private queue: Promise<unknown> = Promise.resolve()
  private readonly inTransaction = new AsyncLocalStorage<boolean>()

  constructor(protected readonly collections: C) {}

  /** Saves data that a write has produced. Throwing discards the write. */
  protected abstract persist(data: CollectionData): Promise<void>

  /** Resolves once the data is loaded. */
  protected abstract ready(): Promise<void>

  async get<K extends keyof C & string>(collection: K, id: string): Promise<DocumentsOf<C>[K] | null> {
    await this.ready()
    return new View(this.collections, this.data).get(collection, id)
  }

  async find<K extends keyof C & string>(collection: K, predicate?: (document: DocumentsOf<C>[K]) => boolean): Promise<DocumentsOf<C>[K][]> {
    await this.ready()
    return new View(this.collections, this.data).find(collection, predicate)
  }

  put<K extends keyof C & string>(collection: K, document: DocumentsOf<C>[K]): Promise<void> {
    return this.transaction(store => store.put(collection, document))
  }

  delete<K extends keyof C & string>(collection: K, id: string): Promise<boolean> {
    return this.transaction(store => store.delete(collection, id))
  }

  transaction<R>(fn: (store: JsonStore<DocumentsOf<C>>) => Promise<R>): Promise<R> {
    if (this.inTransaction.getStore()) {
      return Promise.reject(new NestedWriteError())
    }
    return this.exclusively(async () => {
      await this.ready()
      const snapshot = copy(this.data)
      const result = await this.inTransaction.run(true, () => fn(new View(this.collections, snapshot)))
      await this.persist(snapshot)
      this.data = snapshot
      return result
    })
  }

  protected exclusively<R>(fn: () => Promise<R>): Promise<R> {
    const result = this.queue.then(fn)
    this.queue = result.catch(() => undefined)
    return result
  }
}

/** Reads and writes one data object directly, inside a transaction or for a read. */
class View<C extends CollectionDefinitions> implements JsonStore<DocumentsOf<C>> {
  constructor(private readonly collections: C, private readonly data: CollectionData) {}

  async get<K extends keyof C & string>(collection: K, id: string): Promise<DocumentsOf<C>[K] | null> {
    const found = this.documents(collection).find(document => document.id === id)
    return found ? copy(found) as DocumentsOf<C>[K] : null
  }

  async find<K extends keyof C & string>(collection: K, predicate?: (document: DocumentsOf<C>[K]) => boolean): Promise<DocumentsOf<C>[K][]> {
    const all = copy(this.documents(collection)) as DocumentsOf<C>[K][]
    return predicate ? all.filter(predicate) : all
  }

  async put<K extends keyof C & string>(collection: K, document: DocumentsOf<C>[K]): Promise<void> {
    const documents = this.documents(collection)
    const parsed = this.collections[collection]!.schema.safeParse(copy(document))
    if (!parsed.success) {
      throw new InvalidDocumentError(collection, parsed.error.issues.map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`))
    }
    const stored = copy(parsed.data) as JsonDocument
    const index = documents.findIndex(existing => existing.id === stored.id)
    if (index === -1) {
      documents.push(stored)
    } else {
      documents[index] = stored
    }
  }

  async delete<K extends keyof C & string>(collection: K, id: string): Promise<boolean> {
    const documents = this.documents(collection)
    const index = documents.findIndex(document => document.id === id)
    if (index === -1) {
      return false
    }
    documents.splice(index, 1)
    return true
  }

  /** Already inside one, so a nested transaction joins it. */
  transaction<R>(fn: (store: JsonStore<DocumentsOf<C>>) => Promise<R>): Promise<R> {
    return fn(this)
  }

  private documents(collection: string): JsonDocument[] {
    if (!Object.hasOwn(this.collections, collection)) {
      throw new UnknownCollectionError(collection)
    }
    return (this.data[collection] ??= [])
  }
}
