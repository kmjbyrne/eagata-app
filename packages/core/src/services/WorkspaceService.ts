import { orgPermissions } from '../entities/permissions'
import type { User } from '../entities/User'
import type { Workspace } from '../entities/Workspace'
import type { WorkspaceInvitation } from '../entities/WorkspaceInvitation'
import { ensureWorkspaceOwnerRemains, parseWorkspaceRole } from '../entities/WorkspaceMembership'
import { ForbiddenError, NotFoundError } from '../errors'
import type { CurrentUser } from '../ports/CurrentUser'
import type { IdGenerator } from '../ports/IdGenerator'
import type { Repositories } from '../ports/Repositories'
import { parseEmail } from '../values/Email'
import type { UserId, WorkspaceId } from '../values/Ids'
import { parseName } from '../values/Name'
import { parseSlug, suggestSlug } from '../values/Slug'
import { requireAccessibleOrg, requireActiveUserId, type AccessibleWorkspace } from './access'
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
    return (await requireAccessibleOrg(this.repositories, orgSlug, await requireActiveUserId(this.repositories, this.currentUser))).workspaces
  }

  /**
   * Org owners and admins create workspaces, and become their first owner.
   * The slug defaults to one suggested from the name.
   * @throws ForbiddenError for other org members
   * @throws SlugTakenError
   */
  async create(orgSlug: string, name: string, slug?: string): Promise<Workspace> {
    const userId = await requireActiveUserId(this.repositories, this.currentUser)
    const { org, role } = await requireAccessibleOrg(this.repositories, orgSlug, userId)
    if (!role || !orgPermissions.can(role, 'workspaces.create')) {
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

  /**
   * Everyone with a workspace membership, and the invitations waiting to
   * become one. Org owners and admins without a membership aren't listed.
   */
  async listMembers(orgSlug: string, workspaceSlug: string): Promise<{ members: WorkspaceMember[], invitations: WorkspaceInvitation[] }> {
    const { workspace } = await this.access.require(orgSlug, workspaceSlug, 'members.view')
    const members: WorkspaceMember[] = []
    for (const membership of await this.repositories.workspaceMembers.listByWorkspace(workspace.id)) {
      const user = await this.repositories.users.findById(membership.userId)
      if (user) {
        members.push({ user: { id: user.id, displayName: user.displayName, email: user.email, avatarUrl: user.avatarUrl }, role: membership.role })
      }
    }
    members.sort((a, b) => a.user.displayName.localeCompare(b.user.displayName))
    return { members, invitations: await this.repositories.invitations.listByWorkspace(workspace.id) }
  }

  /**
   * Invites someone by email. The answer is the same whether or not the email
   * has an account, so this can't be used to find out who does. They join
   * when they next open the app, or once an account is set up for them.
   * Inviting the same email again replaces the role.
   * @throws ForbiddenError unless the current user may manage members
   */
  async invite(orgSlug: string, workspaceSlug: string, email: string, role: string): Promise<WorkspaceInvitation> {
    const { workspace, userId } = await this.access.require(orgSlug, workspaceSlug, 'members.manage')
    const invitation: WorkspaceInvitation = { workspaceId: workspace.id, email: parseEmail(email), role: parseWorkspaceRole(role), invitedBy: userId, createdAt: new Date() }
    await this.repositories.invitations.put(invitation)
    return invitation
  }

  /** Withdraws an invitation. Withdrawing one that doesn't exist does nothing. */
  async cancelInvitation(orgSlug: string, workspaceSlug: string, email: string): Promise<void> {
    const { workspace } = await this.access.require(orgSlug, workspaceSlug, 'members.manage')
    await this.repositories.invitations.remove(workspace.id, parseEmail(email))
  }

  /** @throws LastOwnerError if no owner would remain */
  async changeMemberRole(orgSlug: string, workspaceSlug: string, userId: UserId, role: string): Promise<void> {
    const { workspace } = await this.access.require(orgSlug, workspaceSlug, 'members.manage')
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
    const leaving = userId === await requireActiveUserId(this.repositories, this.currentUser)
    const { workspace } = await this.access.require(orgSlug, workspaceSlug, leaving ? 'workspace.view' : 'members.manage')
    await this.repositories.transaction(async (tx) => {
      if (!(await tx.workspaceMembers.find(workspace.id, userId))) {
        throw new NotFoundError('That user is not a member of this workspace')
      }
      ensureWorkspaceOwnerRemains(await tx.workspaceMembers.listByWorkspace(workspace.id), userId, null)
      await tx.workspaceMembers.remove(workspace.id, userId)
    })
  }
}
