import type { MembershipRepository } from './MembershipRepository'
import type { OrgRepository } from './OrgRepository'
import type { UserRepository } from './UserRepository'
import type { WorkspaceMembershipRepository } from './WorkspaceMembershipRepository'
import type { WorkspaceRepository } from './WorkspaceRepository'

export interface TenancyRepositories {
  users: UserRepository
  orgs: OrgRepository
  workspaces: WorkspaceRepository
  /** Org memberships. */
  memberships: MembershipRepository
  workspaceMembers: WorkspaceMembershipRepository
}

/** Every repository, plus a way to make several writes succeed or fail together. */
export interface TenancyStore extends TenancyRepositories {
  /**
   * Keeps all of `fn`'s writes or none. Checks made inside through the given
   * repositories hold until it ends, so a rule such as "an org keeps an owner"
   * can't be broken by two requests at once.
   */
  transaction<R>(fn: (repositories: TenancyRepositories) => Promise<R>): Promise<R>
}
