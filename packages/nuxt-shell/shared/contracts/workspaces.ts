import { z } from 'zod'
import { workspaceRole } from './orgs'

export const createWorkspaceBody = z.object({
  name: z.string(),
  /** Suggested from the name when left out. */
  slug: z.string().optional()
})

export const workspaceResponse = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string()
})

export const workspaceMember = z.object({
  user: z.object({
    id: z.string(),
    displayName: z.string(),
    email: z.string(),
    avatarUrl: z.string().nullable()
  }),
  role: workspaceRole
})

export const inviteBody = z.object({
  email: z.string().max(255),
  role: workspaceRole
})

/** An invitation waiting to become a membership, when its email next opens the app. */
export const invitationResponse = z.object({
  email: z.string(),
  role: workspaceRole,
  createdAt: z.iso.datetime()
})

export const membersResponse = z.object({
  members: z.array(workspaceMember),
  invitations: z.array(invitationResponse)
})

export const changeMemberRoleBody = z.object({
  role: workspaceRole
})

export type CreateWorkspaceBody = z.infer<typeof createWorkspaceBody>
export type WorkspaceResponse = z.infer<typeof workspaceResponse>
export type WorkspaceMemberResponse = z.infer<typeof workspaceMember>
export type InviteBody = z.infer<typeof inviteBody>
export type InvitationResponse = z.infer<typeof invitationResponse>
export type MembersResponse = z.infer<typeof membersResponse>
export type ChangeMemberRoleBody = z.infer<typeof changeMemberRoleBody>
