import { AsyncLocalStorage } from 'node:async_hooks'
import type { z } from 'zod'
import type { CollectionDefinitions, DocumentsOf, JsonDocument } from './collections'
import {
  DriftedCollectionError,
  InvalidDocumentError,
  NestedWriteError,
  UnknownCollectionError,
  type JsonStore,
  type JsonStoreStatus,
  type SeededJsonStore
} from './JsonStore'

export type CollectionData = Record<string, JsonDocument[]>

/** What a store found where it keeps its data. */
export interface StoredContents {
  /** Raw values by key, unchecked. */
  contents: Record<string, unknown>
  seededAt: string | null
}

/** What a store writes back. */
export interface StateToPersist {
  data: CollectionData
  seededAt: string | null
  /** Raw values of drifted collections, kept until a reset. */
  drifted: Record<string, unknown>
}

const MAX_ISSUES = 5

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))

function issuesOf(error: z.ZodError, prefix = ''): string[] {
  return error.issues.map(issue => `${prefix}${issue.path.join('.') || '(root)'}: ${issue.message}`)
}

/**
 * The shared engine of both stores: data held in memory, every write made on
 * a copy and kept only once `persist` succeeds, and writes queued one at a
 * time so concurrent callers never lose each other's changes.
 */
export abstract class SnapshotStore<C extends CollectionDefinitions> implements SeededJsonStore<DocumentsOf<C>> {
  private data: CollectionData = {}
  private seededAt: string | null = null
  private drifted = new Map<string, { raw: unknown, issues: string[] }>()
  private opening?: Promise<void>
  private queue: Promise<unknown> = Promise.resolve()
  private readonly inTransaction = new AsyncLocalStorage<boolean>()

  constructor(protected readonly collections: C) {}

  /** Reads whatever the store holds. Called once, before first use. */
  protected abstract read(): Promise<StoredContents>

  /** Saves the state a write produced. Throwing discards the write. */
  protected abstract persist(state: StateToPersist): Promise<void>

  async get<K extends keyof C & string>(collection: K, id: string): Promise<DocumentsOf<C>[K] | null> {
    await this.ready()
    return this.view(this.data).get(collection, id)
  }

  async find<K extends keyof C & string>(collection: K, predicate?: (document: DocumentsOf<C>[K]) => boolean): Promise<DocumentsOf<C>[K][]> {
    await this.ready()
    return this.view(this.data).find(collection, predicate)
  }

  async status(): Promise<JsonStoreStatus> {
    await this.ready()
    return {
      seededAt: this.seededAt,
      drifted: [...this.drifted].map(([collection, { issues }]) => ({ collection, issues }))
    }
  }

  reset(): Promise<void> {
    return this.exclusively(async () => {
      await this.ready()
      const data = this.seeds(Object.keys(this.collections))
      const seededAt = new Date().toISOString()
      await this.persist({ data, seededAt, drifted: {} })
      this.data = data
      this.seededAt = seededAt
      this.drifted.clear()
    })
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
      const result = await this.inTransaction.run(true, () => fn(this.view(snapshot)))
      await this.persist({ data: snapshot, seededAt: this.seededAt, drifted: this.driftedRaw() })
      this.data = snapshot
      return result
    })
  }

  private ready(): Promise<void> {
    this.opening ??= this.open()
    return this.opening
  }

  /**
   * Checks every collection against its schema. A missing or empty one is
   * seeded. One that fails is set aside as drifted rather than thrown on, so
   * the caller can report it and offer a reset.
   */
  private async open(): Promise<void> {
    const { contents, seededAt } = await this.read()
    const toSeed: string[] = []
    for (const name of Object.keys(this.collections)) {
      const raw = contents[name]
      if (raw === undefined || (Array.isArray(raw) && raw.length === 0)) {
        toSeed.push(name)
        continue
      }
      const checked = this.check(name, raw)
      if (Array.isArray(checked)) {
        this.data[name] = checked
      } else {
        this.drifted.set(name, { raw, issues: checked.issues })
      }
    }
    Object.assign(this.data, this.seeds(toSeed))
    this.seededAt = seededAt
    if (toSeed.some(name => this.collections[name]!.seed)) {
      this.seededAt ??= new Date().toISOString()
      await this.persist({ data: this.data, seededAt: this.seededAt, drifted: this.driftedRaw() })
    }
  }

  private check(name: string, raw: unknown): JsonDocument[] | { issues: string[] } {
    if (!Array.isArray(raw)) {
      return { issues: ['(root): expected a list of documents'] }
    }
    const { schema } = this.collections[name]!
    const documents: JsonDocument[] = []
    const issues: string[] = []
    raw.forEach((document, index) => {
      const parsed = schema.safeParse(document)
      if (parsed.success) {
        documents.push(copy(parsed.data))
      } else {
        issues.push(...issuesOf(parsed.error, `[${index}] `))
      }
    })
    return issues.length ? { issues: issues.slice(0, MAX_ISSUES) } : documents
  }

  /** Seed documents are checked like any write, so a broken seed fails loudly. */
  private seeds(names: string[]): CollectionData {
    const seeded = new View(this.collections, {}, new Set())
    for (const name of names) {
      for (const document of this.collections[name]!.seed?.() ?? []) {
        seeded.putSync(name, document)
      }
    }
    return Object.fromEntries(names.map(name => [name, seeded.documentsOf(name)]))
  }

  private driftedRaw(): Record<string, unknown> {
    return Object.fromEntries([...this.drifted].map(([name, { raw }]) => [name, raw]))
  }

  private view(data: CollectionData): View<C> {
    return new View(this.collections, data, new Set(this.drifted.keys()))
  }

  private exclusively<R>(fn: () => Promise<R>): Promise<R> {
    const result = this.queue.then(fn)
    this.queue = result.catch(() => undefined)
    return result
  }
}

/** Reads and writes one data object directly, inside a transaction or for a read. */
class View<C extends CollectionDefinitions> implements JsonStore<DocumentsOf<C>> {
  constructor(
    private readonly collections: C,
    private readonly data: CollectionData,
    private readonly drifted: ReadonlySet<string>
  ) {}

  async get<K extends keyof C & string>(collection: K, id: string): Promise<DocumentsOf<C>[K] | null> {
    const found = this.documents(collection).find(document => document.id === id)
    return found ? copy(found) as DocumentsOf<C>[K] : null
  }

  async find<K extends keyof C & string>(collection: K, predicate?: (document: DocumentsOf<C>[K]) => boolean): Promise<DocumentsOf<C>[K][]> {
    const all = copy(this.documents(collection)) as DocumentsOf<C>[K][]
    return predicate ? all.filter(predicate) : all
  }

  async put<K extends keyof C & string>(collection: K, document: DocumentsOf<C>[K]): Promise<void> {
    this.putSync(collection, document)
  }

  putSync(collection: string, document: JsonDocument): void {
    const documents = this.documents(collection)
    const parsed = this.collections[collection]!.schema.safeParse(copy(document))
    if (!parsed.success) {
      throw new InvalidDocumentError(collection, issuesOf(parsed.error))
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

  documentsOf(collection: string): JsonDocument[] {
    return this.documents(collection)
  }

  private documents(collection: string): JsonDocument[] {
    if (!Object.hasOwn(this.collections, collection)) {
      throw new UnknownCollectionError(collection)
    }
    if (this.drifted.has(collection)) {
      throw new DriftedCollectionError(collection)
    }
    return (this.data[collection] ??= [])
  }
}
