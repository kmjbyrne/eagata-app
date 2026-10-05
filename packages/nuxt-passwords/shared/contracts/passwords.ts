import { z } from 'zod'

// Lengths are checked by core. These caps only keep huge inputs out.
const password = z.string().max(1024)
const email = z.string().max(255)

export const passwordSignInBody = z.object({ email, password })
export const linkAccountBody = z.object({ password })
export const forgotPasswordBody = z.object({ email })
export const resetPasswordBody = z.object({ token: z.string().max(256), password })
export const inviteBody = z.object({ userId: z.string().max(64) })
export const setPasswordBody = z.object({ current: password.optional(), password })

export const passwordStatusResponse = z.object({ hasPassword: z.boolean() })

/** Who is linking which provider, for the link page. */
export const pendingLinkResponse = z.object({ email: z.string(), provider: z.string() })

export type PasswordSignInBody = z.infer<typeof passwordSignInBody>
export type SetPasswordBody = z.infer<typeof setPasswordBody>
export type PasswordStatusResponse = z.infer<typeof passwordStatusResponse>
export type PendingLinkResponse = z.infer<typeof pendingLinkResponse>
