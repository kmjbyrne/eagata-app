import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import type { MediaKey, MediaStorage } from '@kmjbyrne/core/media'

/** Keeps media as files under a directory, until S3. */
export class LocalDiskMediaStorage implements MediaStorage {
  private readonly root: string

  constructor(root: string) {
    this.root = resolve(root)
  }

  // MediaKey already rules out traversal. This keeps the adapter safe on its own.
  private path(key: MediaKey): string {
    const path = resolve(join(this.root, key))
    if (!path.startsWith(this.root + sep)) {
      throw new Error(`Media key escapes the storage root: ${key}`)
    }
    return path
  }

  async put(key: MediaKey, bytes: Uint8Array, _contentType: string) {
    const path = this.path(key)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, bytes, { flag: 'wx' })
  }

  async get(key: MediaKey) {
    try {
      return new Uint8Array(await readFile(this.path(key)))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      throw error
    }
  }
}
