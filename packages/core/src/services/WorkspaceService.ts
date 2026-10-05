import { canManageWorkspaces } from '../entities/Membership'
import type { User } from '../entities/User'
import type { Workspace } from '../entities/Workspace'
import { ensureWorkspaceOwnerRemains, parseWorkspaceRole } from '../entities/WorkspaceMembership'
import { ForbiddenError, NotFoundError } from '../errors'
import type { CurrentUser } from '../ports/CurrentUser'
import type { IdGenerator } from '../ports/IdGenerator'
import type { Repositories } from '../ports/Repositories'
import { parseEmail } from '../values/Email'
import type { UserId, WorkspaceId } from '../values/Ids'
import { parseName } from '../values/Name'
import { parseSlug, suggestSlug } from '../values/Slug'
import { requireAccessibleOrg, requireUserId, type AccessibleWorkspace } from './access'
import type { WorkspaceAccess } from './WorkspaceAccess'

export interface WorkspaceMember {
  user: Pick<User, 'id' | 'displayName' | 'email' | 'avatarUrl'>
  role: AccessibleWorkspace['role']
}

export class WorkspaceService {
  constructor(
    private readonly repositories: Repositories,
    private readonly currentUser: CurrentUser,
    private readonly ids: IdGenerator,
    private readonly access: WorkspaceAccess
  ) {}

  /** The org's workspaces the user can see, oldest first. */
  async list(orgSlug: string): Promise<AccessibleWorkspace[]> {
    return (await requireAccessibleOrg(this.repositories, orgSlug, requireUserId(this.currentUser))).workspaces
  }

  /**
   * Org owners and admins create workspaces, and become their first owner.
   * The slug defaults to one suggested from the name.
   * @throws ForbiddenError for other org members
   * @throws SlugTakenError
   */
  async create(orgSlug: string, name: string, slug?: string): Promise<Workspace> {
    const userId = requireUserId(this.currentUser)
    const { org, role } = await requireAccessibleOrg(this.repositories, orgSlug, userId)
    if (!role || !canManageWorkspaces(role)) {
      throw new ForbiddenError('Only organization owners and admins create workspaces')
    }
    const workspace: Workspace = {
      id: this.ids.next() as WorkspaceId,
      orgId: org.id,
      name: parseName(name),
      slug: slug === undefined ? suggestSlug(name) : parseSlug(slug),
      createdAt: new Date()
    }
    await this.repositories.transaction(async (tx) => {
      await tx.workspaces.create(workspace)
      await tx.workspaceMembers.add({ workspaceId: workspace.id, userId, role: 'owner' })
    })
    return workspace
  }

  /** Everyone with a workspace membership. Org owners and admins without one aren't listed. */
  async listMembers(orgSlug: string, workspaceSlug: string): Promise<WorkspaceMember[]> {
    const { workspace } = await this.access.require(orgSlug, workspaceSlug)
    const members: WorkspaceMember[] = []
    for (const membership of await this.repositories.workspaceMembers.listByWorkspace(workspace.id)) {
      const user = await this.repositories.users.findById(membership.userId)
      if (user) {
        members.push({ user: { id: user.id, displayName: user.displayName, email: user.email, avatarUrl: user.avatarUrl }, role: membership.role })
      }
    }
    return members.sort((a, b) => a.user.displayName.localeCompare(b.user.displayName))
  }

  /**
   * Shares the workspace with someone who has an account, by their email.
   * @throws ForbiddenError unless the current user is a workspace owner
   * @throws NotFoundError if no account has the email
   * @throws AlreadyMemberError
   */
  async addMember(orgSlug: string, workspaceSlug: string, email: string, role: string): Promise<WorkspaceMember> {
    const { workspace } = await this.access.require(orgSlug, workspaceSlug, 'owner')
    const parsedRole = parseWorkspaceRole(role)
    const user = await this.repositories.users.findByEmail(parseEmail(email))
    if (!user) {
      throw new NotFoundError('No account has that email. They need to sign up first')
    }
    await this.repositories.workspaceMembers.add({ workspaceId: workspace.id, userId: user.id, role: parsedRole })
    return { user: { id: user.id, displayName: user.displayName, email: user.email, avatarUrl: user.avatarUrl }, role: parsedRole }
  }

  /** @throws LastOwnerError if no owner would remain */
  async changeMemberRole(orgSlug: string, workspaceSlug: string, userId: UserId, role: string): Promise<void> {
    const { workspace } = await this.access.require(orgSlug, workspaceSlug, 'owner')
    const parsedRole = parseWorkspaceRole(role)
    await this.repositories.transaction(async (tx) => {
      const membership = await tx.workspaceMembers.find(workspace.id, userId)
      if (!membership) {
        throw new NotFoundError('That user is not a member of this workspace')
      }
      ensureWorkspaceOwnerRemains(await tx.workspaceMembers.listByWorkspace(workspace.id), userId, parsedRole)
      await tx.workspaceMembers.update({ ...membership, role: parsedRole })
    })
  }

  /**
   * Owners remove anyone. Any member may remove themselves, to leave.
   * @throws LastOwnerError if no owner would remain
   */
  async removeMember(orgSlug: string, workspaceSlug: string, userId: UserId): Promise<void> {
    const leaving = userId === requireUserId(this.currentUser)
    const { workspace } = await this.access.require(orgSlug, workspaceSlug, leaving ? 'viewer' : 'owner')
    await this.repositories.transaction(async (tx) => {
      if (!(await tx.workspaceMembers.find(workspace.id, userId))) {
        throw new NotFoundError('That user is not a member of this workspace')
      }
      ensureWorkspaceOwnerRemains(await tx.workspaceMembers.listByWorkspace(workspace.id), userId, null)
      await tx.workspaceMembers.remove(workspace.id, userId)
    })
  }
}
