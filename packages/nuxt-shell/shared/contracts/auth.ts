import { z } from 'zod'

export const loginQuery = z.object({
  /** An account to preselect at the provider, usually an email. */
  hint: z.string().max(255).optional(),
  /** `connect` links the provider account to the signed-in user, from their settings. */
  intent: z.enum(['connect']).optional()
})

/** What the provider sends back: a code and our state, or an error. */
export const callbackQuery = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional()
})

/** Why a sign-in ended back on /login, in `?error=`. */
export const SIGN_IN_ERRORS = ['cancelled', 'provider', 'not-invited', 'email-not-verified', 'identity-mismatch', 'deactivated'] as const

export type SignInError = typeof SIGN_IN_ERRORS[number]

/** How connecting an account from Settings ended, in `?connect=`. */
export const CONNECT_OUTCOMES = ['connected', 'in-use', 'mismatch', 'cancelled', 'provider'] as const

export type ConnectOutcome = typeof CONNECT_OUTCOMES[number]
