import { randomUUID } from 'node:crypto'
import { isPlatformAdmin } from '../entities/User'
import { InvalidInputError, NotFoundError } from '../errors'
import type { CurrentUser } from '../ports/CurrentUser'
import type { Repositories } from '../ports/Repositories'
import { requireUser, workspaceRoleById } from '../services/access'
import type { WorkspaceAccess } from '../services/WorkspaceAccess'
import { contentTypeFor, detectImageType } from './ImageType'
import { mediaKeyExtension, mediaKeyWorkspace, parseMediaKey, type MediaKey } from './MediaKey'
import type { MediaStorage } from './ports'

export const MEDIA_MAX_BYTES = 15 * 1024 * 1024

export class UnsupportedMediaError extends InvalidInputError {
  constructor() {
    super('Only JPEG, PNG, GIF and WebP images can be uploaded')
  }
}

export class MediaTooLargeError extends InvalidInputError {
  constructor() {
    super('Images must be 15 MB or smaller')
  }
}

export interface StoredMedia {
  key: MediaKey
  /** The app-owned URL content stores, so moving storage never means rewriting content. */
  src: string
}

export interface MediaAdapters {
  repositories: Repositories
  currentUser: CurrentUser
  access: WorkspaceAccess
  storage: MediaStorage
  newId?: () => string
  now?: () => Date
}

/**
 * Images uploaded in a workspace. Only people who can see the workspace, and
 * platform admins, can open them.
 */
export class MediaService {
  constructor(private readonly adapters: MediaAdapters) {}

  /**
   * @throws MediaTooLargeError
   * @throws UnsupportedMediaError for anything but a JPEG, PNG, GIF or WebP, judged by its bytes
   * @throws NotFoundError if the user can't see the workspace
   */
  async upload(orgSlug: string, workspaceSlug: string, bytes: Uint8Array): Promise<StoredMedia> {
    const { workspace } = await this.adapters.access.require(orgSlug, workspaceSlug, 'media.upload')
    if (bytes.byteLength > MEDIA_MAX_BYTES) {
      throw new MediaTooLargeError()
    }
    const type = detectImageType(bytes)
    if (!type) {
      throw new UnsupportedMediaError()
    }
    const now = this.adapters.now?.() ?? new Date()
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const id = this.adapters.newId?.() ?? randomUUID()
    const key = parseMediaKey(`workspaces/${workspace.id}/${now.getUTCFullYear()}/${month}/${id}.${type.extension}`)
    await this.adapters.storage.put(key, bytes, type.contentType)
    return { key, src: `/media/${key}` }
  }

  /**
   * An image, for someone who can see its workspace, or a platform admin.
   * @throws NotSignedInError
   * @throws NotFoundError for anyone else, and for a missing or malformed key alike
   */
  async read(keyInput: string): Promise<{ bytes: Uint8Array, contentType: string }> {
    const user = await requireUser(this.adapters.repositories, this.adapters.currentUser)
    let key: MediaKey
    try {
      key = parseMediaKey(keyInput)
    } catch {
      throw new NotFoundError('Media not found')
    }
    if (!isPlatformAdmin(user) && !await workspaceRoleById(this.adapters.repositories, mediaKeyWorkspace(key), user.id)) {
      throw new NotFoundError('Media not found')
    }
    const bytes = await this.adapters.storage.get(key)
    if (!bytes) {
      throw new NotFoundError('Media not found')
    }
    return { bytes, contentType: contentTypeFor(mediaKeyExtension(key)) }
  }
}
