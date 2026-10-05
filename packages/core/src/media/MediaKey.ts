import { InvalidInputError } from '../errors'
import type { UserId, WorkspaceId } from '../values/Ids'

export type MediaKey = string & { readonly __brand: 'MediaKey' }

export const MEDIA_EXTENSIONS = ['jpg', 'png', 'gif', 'webp'] as const

export type MediaExtension = typeof MEDIA_EXTENSIONS[number]

export class InvalidMediaKeyError extends InvalidInputError {
  constructor(readonly input: string) {
    super(`Invalid media key: "${input}"`)
  }
}

// <scope>/<id>/<year>/<month>/<uuid>.<ext>, where the scope is `workspaces`
// for a workspace's images and `users` for a person's own, such as feedback
// screenshots. The owner comes first so every read can check access to it, and
// nothing in a key can escape a storage root.
const KEY_PATTERN = new RegExp(`^(workspaces|users)/([A-Za-z0-9-]{1,64})/\\d{4}/\\d{2}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(${MEDIA_EXTENSIONS.join('|')})$`)

export function parseMediaKey(input: string): MediaKey {
  if (!KEY_PATTERN.test(input)) {
    throw new InvalidMediaKeyError(input)
  }
  return input as MediaKey
}

export type MediaOwner = { kind: 'workspace', id: WorkspaceId } | { kind: 'user', id: UserId }

/** Who the image belongs to, and so who may read it. */
export function mediaKeyOwner(key: MediaKey): MediaOwner {
  const [, scope, id] = KEY_PATTERN.exec(key)!
  return scope === 'users' ? { kind: 'user', id: id as UserId } : { kind: 'workspace', id: id as WorkspaceId }
}

export function mediaKeyExtension(key: MediaKey): MediaExtension {
  return key.slice(key.lastIndexOf('.') + 1) as MediaExtension
}
