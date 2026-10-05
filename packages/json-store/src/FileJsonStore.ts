import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { Low } from 'lowdb'
import { DataFile } from 'lowdb/node'
import { META_KEY, type CollectionDefinitions } from './collections'
import { SnapshotStore, type StateToPersist, type StoredContents } from './SnapshotStore'

/** Bumped only if the file's layout changes, not when collections do. */
const FORMAT_VERSION = 1

type FileContents = Record<string, unknown>

interface FileMeta {
  version: number
  seededAt: string | null
}

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
  /** Keys in the file that no collection defines, written back untouched. */
  private readonly other: FileContents = {}

  constructor({ file, collections }: FileJsonStoreOptions<C>) {
    super(collections)
    this.file = file
    this.db = new Low(new DataFile<FileContents>(file, {
      parse: JSON.parse,
      stringify: data => `${JSON.stringify(data, null, 2)}\n`
    }), {})
  }

  protected async read(): Promise<StoredContents> {
    await this.db.read()
    const { [META_KEY]: meta, ...contents } = this.db.data
    for (const [key, value] of Object.entries(contents)) {
      if (!Object.hasOwn(this.collections, key)) {
        this.other[key] = value
      }
    }
    return { contents, seededAt: (meta as Partial<FileMeta> | undefined)?.seededAt ?? null }
  }

  protected async persist({ data, seededAt, drifted }: StateToPersist): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true })
    const meta: FileMeta = { version: FORMAT_VERSION, seededAt }
    const collections = Object.keys(this.collections).filter(name => name in data)
    this.db.data = {
      [META_KEY]: meta,
      ...Object.fromEntries(collections.map(name => [name, data[name]])),
      ...drifted,
      ...this.other
    }
    await this.db.write()
  }
}
