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
