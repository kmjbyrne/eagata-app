import type { CurrentUser } from '../ports/CurrentUser'
import type { IdGenerator } from '../ports/IdGenerator'
import type { Repositories } from '../ports/Repositories'
import { AuthService } from './AuthService'
import { OrgService } from './OrgService'
import { PlatformOrgService } from './PlatformOrgService'
import { PlatformUserService } from './PlatformUserService'
import { UserService } from './UserService'
import { WorkspaceAccess } from './WorkspaceAccess'
import { WorkspaceService } from './WorkspaceService'

export interface CoreAdapters {
  repositories: Repositories
  currentUser: CurrentUser
  ids: IdGenerator
}

export interface CoreServices {
  auth: AuthService
  users: UserService
  orgs: OrgService
  workspaces: WorkspaceService
  workspaceAccess: WorkspaceAccess
  platformOrgs: PlatformOrgService
  platformUsers: PlatformUserService
}

/** Every core service on the given adapters. Cheap enough to call per request. */
export function createCoreServices({ repositories, currentUser, ids }: CoreAdapters): CoreServices {
  const workspaceAccess = new WorkspaceAccess(repositories, currentUser)
  return {
    auth: new AuthService(repositories, ids),
    users: new UserService(repositories, currentUser),
    orgs: new OrgService(repositories, currentUser),
    workspaces: new WorkspaceService(repositories, currentUser, ids, workspaceAccess),
    workspaceAccess,
    platformOrgs: new PlatformOrgService(repositories, currentUser, ids),
    platformUsers: new PlatformUserService(repositories, currentUser, ids)
  }
}
