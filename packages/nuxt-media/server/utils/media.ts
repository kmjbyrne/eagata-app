import type { MediaStorage } from '@kmjbyrne/core/media'
import { LocalDiskMediaStorage } from '../adapters/LocalDiskMediaStorage'
// Adds this layer's adapter and service to the shell's types, wherever the layer is used.
import type {} from '../../types'

let defaultStorage: MediaStorage | undefined

/** The provided storage, else local disk under NUXT_MEDIA_DIR. */
export function useMediaStorage(): MediaStorage {
  const provided = useAdapters().mediaStorage
  if (provided) {
    return provided
  }
  defaultStorage ??= new LocalDiskMediaStorage(useRuntimeConfig().mediaDir)
  return defaultStorage
}
