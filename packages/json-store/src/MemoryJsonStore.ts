import type { CollectionDefinitions } from './collections'
import { SnapshotStore, type StoredContents } from './SnapshotStore'

/** Holds everything in memory, for tests. */
export class MemoryJsonStore<C extends CollectionDefinitions> extends SnapshotStore<C> {
  /** `contents` stands in for data found at startup, unchecked, as a file would hold it. */
  constructor(collections: C, private readonly contents: Record<string, unknown> = {}) {
    super(collections)
  }

  protected async read(): Promise<StoredContents> {
    return { contents: this.contents, seededAt: null }
  }

  protected async persist(): Promise<void> {}
}
