import type { CurrentUser } from '../ports/CurrentUser'
import type { IdGenerator } from '../ports/IdGenerator'
import type { LinkProof } from '../ports/LinkProof'
import type { Repositories } from '../ports/Repositories'
import { AuthService } from './AuthService'
import { FeatureAccess } from './FeatureAccess'
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
  /** Whether linking a provider account needs proof, such as a password. Defaults to never. */
  linkProof?: LinkProof
  /** Every feature flag the app knows, such as `progressBoard`. Defaults to none. */
  features?: readonly string[]
}

export interface CoreServices {
  auth: AuthService
  users: UserService
  orgs: OrgService
  workspaces: WorkspaceService
  workspaceAccess: WorkspaceAccess
  /** Which flagged features an org has: services behind a flag check it first. */
  features: FeatureAccess
  platformOrgs: PlatformOrgService
  platformUsers: PlatformUserService
}

/** Every core service on the given adapters. Cheap enough to call per request. */
export function createCoreServices({ repositories, currentUser, ids, linkProof, features: catalog = [] }: CoreAdapters): CoreServices {
  const workspaceAccess = new WorkspaceAccess(repositories, currentUser)
  const features = new FeatureAccess(repositories, catalog)
  return {
    auth: new AuthService(repositories, currentUser, linkProof),
    users: new UserService(repositories, currentUser),
    orgs: new OrgService(repositories, currentUser, features),
    workspaces: new WorkspaceService(repositories, currentUser, ids, workspaceAccess),
    workspaceAccess,
    features,
    platformOrgs: new PlatformOrgService(repositories, currentUser, ids, features),
    platformUsers: new PlatformUserService(repositories, currentUser, ids)
  }
}
