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

export const addMemberBody = z.object({
  email: z.string(),
  role: workspaceRole
})

export const changeMemberRoleBody = z.object({
  role: workspaceRole
})

export type CreateWorkspaceBody = z.infer<typeof createWorkspaceBody>
export type WorkspaceResponse = z.infer<typeof workspaceResponse>
export type WorkspaceMemberResponse = z.infer<typeof workspaceMember>
export type AddMemberBody = z.infer<typeof addMemberBody>
export type ChangeMemberRoleBody = z.infer<typeof changeMemberRoleBody>
