import { InvalidInputError } from '../errors'
import type { WorkspaceId } from '../values/Ids'

export type MediaKey = string & { readonly __brand: 'MediaKey' }

export const MEDIA_EXTENSIONS = ['jpg', 'png', 'gif', 'webp'] as const

export type MediaExtension = typeof MEDIA_EXTENSIONS[number]

export class InvalidMediaKeyError extends InvalidInputError {
  constructor(readonly input: string) {
    super(`Invalid media key: "${input}"`)
  }
}

// workspaces/<workspace id>/<year>/<month>/<uuid>.<ext>. The workspace comes
// first so every read can check access to it, and nothing in a key can escape
// a storage root.
const KEY_PATTERN = new RegExp(`^workspaces/([A-Za-z0-9-]{1,64})/\\d{4}/\\d{2}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(${MEDIA_EXTENSIONS.join('|')})$`)

export function parseMediaKey(input: string): MediaKey {
  if (!KEY_PATTERN.test(input)) {
    throw new InvalidMediaKeyError(input)
  }
  return input as MediaKey
}

export function mediaKeyWorkspace(key: MediaKey): WorkspaceId {
  return KEY_PATTERN.exec(key)![1] as WorkspaceId
}

export function mediaKeyExtension(key: MediaKey): MediaExtension {
  return key.slice(key.lastIndexOf('.') + 1) as MediaExtension
}
