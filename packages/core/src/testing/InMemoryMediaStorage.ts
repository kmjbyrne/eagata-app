import type { MediaKey } from '../media/MediaKey'
import type { MediaStorage } from '../media/ports'

export class InMemoryMediaStorage implements MediaStorage {
  readonly files = new Map<MediaKey, { bytes: Uint8Array, contentType: string }>()

  async put(key: MediaKey, bytes: Uint8Array, contentType: string) {
    this.files.set(key, { bytes, contentType })
  }

  async get(key: MediaKey) {
    return this.files.get(key)?.bytes ?? null
  }
}
