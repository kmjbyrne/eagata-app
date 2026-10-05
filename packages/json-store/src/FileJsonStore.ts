import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { Low } from 'lowdb'
import { DataFile } from 'lowdb/node'
import { META_KEY, type CollectionDefinitions } from './collections'
import { SnapshotStore, type CollectionData } from './SnapshotStore'

/** Bumped only if the file's layout changes, not when collections do. */
const FORMAT_VERSION = 1

type FileContents = Record<string, unknown>

export interface FileJsonStoreOptions<C extends CollectionDefinitions> {
  /** Created on first write, with any missing directories. */
  file: string
  collections: C
}

/**
 * Keeps everything in one JSON file, for a development server. The file is
 * read on first use and rewritten after every write, with each collection as
 * an array under its name and bookkeeping under `_meta`.
 */
export class FileJsonStore<C extends CollectionDefinitions> extends SnapshotStore<C> {
  private readonly file: string
  private readonly db: Low<FileContents>
  private loading?: Promise<void>
  /** Keys in the file that no collection defines, written back untouched. */
  private other: FileContents = {}

  constructor({ file, collections }: FileJsonStoreOptions<C>) {
    super(collections)
    this.file = file
    this.db = new Low(new DataFile<FileContents>(file, {
      parse: JSON.parse,
      stringify: data => `${JSON.stringify(data, null, 2)}\n`
    }), {})
  }

  protected ready(): Promise<void> {
    this.loading ??= this.load()
    return this.loading
  }

  protected async persist(data: CollectionData): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true })
    this.db.data = { [META_KEY]: { version: FORMAT_VERSION }, ...data, ...this.other }
    await this.db.write()
  }

  private async load(): Promise<void> {
    await this.db.read()
    const { [META_KEY]: _meta, ...contents } = this.db.data
    for (const [key, value] of Object.entries(contents)) {
      if (Object.hasOwn(this.collections, key) && Array.isArray(value)) {
        this.data[key] = value
      } else {
        this.other[key] = value
      }
    }
  }
}
