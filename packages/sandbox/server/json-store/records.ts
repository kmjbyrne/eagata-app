import { z } from 'zod'

// How tenancy data is stored in the JSON file. Dates are ISO strings, since
// the file holds JSON. Memberships get an id from their pair, as every
// document needs one.

export const userRecord = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
  // Required, so dev data saved with the old isPlatformAdmin flag is reported,
  // and the login page offers a reset, rather than losing the role silently.
  platformRole: z.object({
    role: z.enum(['admin']),
    grantedAt: z.iso.datetime(),
    grantedBy: z.string().nullable()
  }).nullable(),
  identities: z.array(z.object({
    provider: z.string(),
    subject: z.string(),
    // Dev data saved before link times were kept reads as linked on load.
    linkedAt: z.iso.datetime().default(() => new Date().toISOString())
  })),
  // Defaults, so dev data saved before it existed still loads.
  deactivatedAt: z.iso.datetime().nullable().default(null)
})

export const orgRecord = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  previousSlugs: z.array(z.string()),
  isPersonal: z.boolean()
})

export const workspaceRecord = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.iso.datetime()
})

export const membershipRecord = z.object({
  id: z.string(),
  orgId: z.string(),
  userId: z.string(),
  role: z.enum(['owner', 'admin', 'member'])
})

export const workspaceMemberRecord = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  role: z.enum(['owner', 'editor', 'viewer'])
})

export type UserRecord = z.infer<typeof userRecord>
export type OrgRecord = z.infer<typeof orgRecord>
export type WorkspaceRecord = z.infer<typeof workspaceRecord>
export type MembershipRecord = z.infer<typeof membershipRecord>
export type WorkspaceMemberRecord = z.infer<typeof workspaceMemberRecord>

export const membershipId = (orgId: string, userId: string) => `${orgId}:${userId}`
export const workspaceMemberId = (workspaceId: string, userId: string) => `${workspaceId}:${userId}`
