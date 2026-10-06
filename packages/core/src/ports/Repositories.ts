import type { MembershipRepository } from './MembershipRepository'
import type { OrgFeatureRepository } from './OrgFeatureRepository'
import type { OrgRepository } from './OrgRepository'
import type { UserRepository } from './UserRepository'
import type { WorkspaceInvitationRepository } from './WorkspaceInvitationRepository'
import type { WorkspaceMembershipRepository } from './WorkspaceMembershipRepository'
import type { WorkspaceRepository } from './WorkspaceRepository'

/** Everything core stores, as core sees it, whatever the database behind it. */
export interface Repositories {
  users: UserRepository
  orgs: OrgRepository
  workspaces: WorkspaceRepository
  /** Org memberships. */
  memberships: MembershipRepository
  workspaceMembers: WorkspaceMembershipRepository
  /** Workspace invitations by email, waiting to become memberships. */
  invitations: WorkspaceInvitationRepository
  /** The flagged features each org has switched on. */
  orgFeatures: OrgFeatureRepository
  /**
   * Keeps all of `fn`'s writes or none. Inside, use the repositories `fn` is
   * given: checks made through them hold until it ends, so a rule such as "an
   * org keeps an owner" can't be broken by two requests at once. A
   * transaction started on them joins this one.
   */
  transaction<R>(fn: (tx: Repositories) => Promise<R>): Promise<R>
}
