import type { User } from '../entities/User'
import type { Repositories } from '../ports/Repositories'

/**
 * Turns the user's pending invitations into memberships. A workspace they
 * already belong to keeps their membership as it is. Runs when they next open
 * the app, so inviting never reveals whether an email has an account.
 */
export async function acceptInvitations(repositories: Repositories, user: User): Promise<void> {
  const invitations = await repositories.invitations.listByEmail(user.email)
  if (!invitations.length) {
    return
  }
  await repositories.transaction(async (tx) => {
    for (const invitation of await tx.invitations.listByEmail(user.email)) {
      if (await tx.workspaces.findById(invitation.workspaceId) && !await tx.workspaceMembers.find(invitation.workspaceId, user.id)) {
        await tx.workspaceMembers.add({ workspaceId: invitation.workspaceId, userId: user.id, role: invitation.role })
      }
      await tx.invitations.remove(invitation.workspaceId, invitation.email)
    }
  })
}
