import { z } from 'zod'

export const loginQuery = z.object({
  /** An account to preselect at the provider, usually an email. */
  hint: z.string().max(255).optional()
})

/** What the provider sends back: a code and our state, or an error. */
export const callbackQuery = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional()
})

/** Why a sign-in ended back on /login, in `?error=`. */
export const SIGN_IN_ERRORS = ['cancelled', 'provider', 'email-not-verified', 'identity-mismatch', 'deactivated'] as const

export type SignInError = typeof SIGN_IN_ERRORS[number]
