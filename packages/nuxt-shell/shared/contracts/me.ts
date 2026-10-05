import { z } from 'zod'

export const meResponse = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
  isPlatformAdmin: z.boolean(),
  /** Which providers the user signs in with. Subjects stay on the server. */
  identities: z.array(z.object({ provider: z.string() }))
})

export type MeResponse = z.infer<typeof meResponse>

/** Remembers the workspace being viewed, for where `/` goes next time. */
export const lastWorkspaceBody = z.object({
  org: z.string(),
  workspace: z.string()
})

/** Where `/` should send the user: a workspace path, or `/choose`. */
export const homeResponse = z.object({ path: z.string() })

export type LastWorkspaceBody = z.infer<typeof lastWorkspaceBody>
export type HomeResponse = z.infer<typeof homeResponse>
