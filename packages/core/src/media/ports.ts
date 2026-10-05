import type { MediaKey } from './MediaKey'

/** Where uploaded files live: local disk for now, S3 later. */
export interface MediaStorage {
  put(key: MediaKey, bytes: Uint8Array, contentType: string): Promise<void>
  /** Null when there is no file under the key. */
  get(key: MediaKey): Promise<Uint8Array | null>
}
