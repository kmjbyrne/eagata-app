import type { MediaService, MediaStorage } from '@kmjbyrne/core/media'

declare module '@kmjbyrne/nuxt-shell/types' {
  interface AppAdapters {
    /** Defaults to local disk under NUXT_MEDIA_DIR. */
    mediaStorage?: MediaStorage
  }

  interface AppServices {
    media: MediaService
  }
}

export {}
