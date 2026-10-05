// Optional image uploads, per workspace. Apps without them never import this entry.
export { contentTypeFor, detectImageType } from './ImageType'
export type { ImageType } from './ImageType'
export { InvalidMediaKeyError, MEDIA_EXTENSIONS, mediaKeyExtension, mediaKeyOwner, parseMediaKey } from './MediaKey'
export type { MediaExtension, MediaKey, MediaOwner } from './MediaKey'
export { MEDIA_MAX_BYTES, MediaService, MediaTooLargeError, UnsupportedMediaError } from './MediaService'
export type { MediaAdapters, StoredMedia } from './MediaService'
export type { MediaStorage } from './ports'
