import type { CollectionDefinitions } from './collections'
import { SnapshotStore, type CollectionData } from './SnapshotStore'

/** Holds everything in memory, for tests. */
export class MemoryJsonStore<C extends CollectionDefinitions> extends SnapshotStore<C> {
  protected async persist(_data: CollectionData): Promise<void> {}

  protected async ready(): Promise<void> {}
}
