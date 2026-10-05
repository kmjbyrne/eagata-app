import type { CurrentUser } from '../ports/CurrentUser'
import type { IdGenerator } from '../ports/IdGenerator'
import type { TenancyStore } from '../ports/TenancyStore'
import { AuthService } from './AuthService'

export interface CoreAdapters {
  store: TenancyStore
  currentUser: CurrentUser
  ids: IdGenerator
}

export interface CoreServices {
  auth: AuthService
}

/** Every core service on the given adapters. Cheap enough to call per request. */
export function createCoreServices({ store, ids }: CoreAdapters): CoreServices {
  return {
    auth: new AuthService(store, ids)
  }
}
