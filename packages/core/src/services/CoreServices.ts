import type { CurrentUser } from '../ports/CurrentUser'
import type { IdGenerator } from '../ports/IdGenerator'
import type { TenancyStore } from '../ports/TenancyStore'
import { AuthService } from './AuthService'
import { OrgService } from './OrgService'
import { UserService } from './UserService'
import { WorkspaceAccess } from './WorkspaceAccess'
import { WorkspaceService } from './WorkspaceService'

export interface CoreAdapters {
  store: TenancyStore
  currentUser: CurrentUser
  ids: IdGenerator
}

export interface CoreServices {
  auth: AuthService
  users: UserService
  orgs: OrgService
  workspaces: WorkspaceService
  workspaceAccess: WorkspaceAccess
}

/** Every core service on the given adapters. Cheap enough to call per request. */
export function createCoreServices({ store, currentUser, ids }: CoreAdapters): CoreServices {
  const workspaceAccess = new WorkspaceAccess(store, currentUser)
  return {
    auth: new AuthService(store, ids),
    users: new UserService(store, currentUser),
    orgs: new OrgService(store, currentUser),
    workspaces: new WorkspaceService(store, currentUser, ids, workspaceAccess),
    workspaceAccess
  }
}
