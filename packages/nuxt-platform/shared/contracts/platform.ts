import { orgRole, orgSummary } from '@kmjbyrne/nuxt-shell/contracts'
import { z } from 'zod'

export const platformOrg = orgSummary.extend({ previousSlugs: z.array(z.string()) })

export const platformOrgSummary = z.object({
  org: platformOrg,
  memberCount: z.number(),
  workspaceCount: z.number()
})

export const platformUserSummary = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
  isPlatformAdmin: z.boolean(),
  /** Whether they have signed in at least once, so their account is linked. */
  hasSignedIn: z.boolean(),
  deactivatedAt: z.string().nullable()
})

export const platformOrgDetail = z.object({
  org: platformOrg,
  members: z.array(z.object({ user: platformUserSummary, role: orgRole })),
  workspaces: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() }))
})

export const platformUserDetail = z.object({
  user: platformUserSummary,
  orgs: z.array(z.object({ org: platformOrg, role: orgRole }))
})

export const createOrgBody = z.object({
  name: z.string(),
  ownerUserId: z.string(),
  /** Suggested from the name when left out. */
  slug: z.string().optional()
})

export const changeSlugBody = z.object({ slug: z.string() })

export const addOrgMemberBody = z.object({ userId: z.string(), role: orgRole })

export const changeOrgRoleBody = z.object({ role: orgRole })

export const createUserBody = z.object({ displayName: z.string(), email: z.string() })

/** One change per request: the platform role, or deactivation. */
export const updateUserBody = z.union([
  z.object({ isPlatformAdmin: z.boolean() }).strict(),
  z.object({ deactivated: z.boolean() }).strict()
])

export type PlatformOrg = z.infer<typeof platformOrg>
export type PlatformOrgSummaryResponse = z.infer<typeof platformOrgSummary>
export type PlatformUserSummary = z.infer<typeof platformUserSummary>
export type PlatformOrgDetailResponse = z.infer<typeof platformOrgDetail>
export type PlatformUserDetailResponse = z.infer<typeof platformUserDetail>
export type CreateOrgBody = z.infer<typeof createOrgBody>
export type CreateUserBody = z.infer<typeof createUserBody>
