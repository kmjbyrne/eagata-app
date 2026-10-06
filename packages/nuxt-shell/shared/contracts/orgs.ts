import { z } from 'zod'

export const orgRole = z.enum(['owner', 'admin', 'member'])
export const workspaceRole = z.enum(['owner', 'editor', 'viewer'])

export const orgSummary = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  isPersonal: z.boolean()
})

export const accessibleWorkspace = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  role: workspaceRole,
  /** What the user may do here, such as `members.manage`. Pages check these, never the role. */
  permissions: z.array(z.string())
})

/** An org the user can reach, their org role (null if they only reach shared workspaces), and the workspaces they see. */
export const accessibleOrg = z.object({
  org: orgSummary,
  role: orgRole.nullable(),
  /** What the user may do in the org, such as `workspaces.create`. Empty without an org role. */
  permissions: z.array(z.string()),
  /** The flagged features the org has switched on, such as `progressBoard`. Pages check these. */
  features: z.array(z.string()),
  workspaces: z.array(accessibleWorkspace)
})

export const resolveSlugResponse = z.object({ slug: z.string() })

export type OrgRoleValue = z.infer<typeof orgRole>
export type WorkspaceRoleValue = z.infer<typeof workspaceRole>
export type OrgSummary = z.infer<typeof orgSummary>
export type AccessibleWorkspaceResponse = z.infer<typeof accessibleWorkspace>
export type AccessibleOrgResponse = z.infer<typeof accessibleOrg>
export type ResolveSlugResponse = z.infer<typeof resolveSlugResponse>
