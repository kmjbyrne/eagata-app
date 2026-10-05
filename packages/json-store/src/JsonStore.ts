import type { JsonDocument } from './collections'

/**
 * Named collections of JSON documents. Documents go in and come out as JSON
 * copies, so callers can never change stored data by mutating an object, and
 * a value that JSON cannot hold (a Date, say) comes back as JSON would hold it.
 */
export interface JsonStore<D extends { [K in keyof D]: JsonDocument }> {
  get<K extends keyof D & string>(collection: K, id: string): Promise<D[K] | null>
  /** In the order the documents were first put. */
  find<K extends keyof D & string>(collection: K, predicate?: (document: D[K]) => boolean): Promise<D[K][]>
  /** Adds the document, or replaces the one with its id in place. */
  put<K extends keyof D & string>(collection: K, document: D[K]): Promise<void>
  /** Whether there was a document to delete. */
  delete<K extends keyof D & string>(collection: K, id: string): Promise<boolean>
  /**
   * Runs `fn` against a copy of the data and keeps its writes only if it
   * resolves. Use the store it is given: the outer store throws if called
   * from inside, because waiting for the transaction to end would deadlock.
   */
  transaction<R>(fn: (store: JsonStore<D>) => Promise<R>): Promise<R>
}

export class UnknownCollectionError extends Error {
  constructor(readonly collection: string) {
    super(`No collection named "${collection}"`)
    this.name = 'UnknownCollectionError'
  }
}

export class InvalidDocumentError extends Error {
  constructor(readonly collection: string, readonly issues: string[]) {
    super(`Invalid document for "${collection}": ${issues.join('; ')}`)
    this.name = 'InvalidDocumentError'
  }
}

export class NestedWriteError extends Error {
  constructor() {
    super('Write through the store transaction() passes in, not the outer store')
    this.name = 'NestedWriteError'
  }
}
