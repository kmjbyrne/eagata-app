import { TooManyAttemptsError, type RateRule } from '@kmjbyrne/core'
import type { PasswordRepository } from '@kmjbyrne/core/passwords'
import type { H3Event } from 'h3'
import { MysqlPasswordRepository } from '../adapters/mysql/MysqlPasswordRepository'
// Adds this layer's adapters and service to the shell's types, wherever the layer is used.
import type {} from '../../types'

let defaultRepository: PasswordRepository | undefined

/** The provided repository, such as the sandbox's, else MariaDB from NUXT_DATABASE_URL. */
export function usePasswordRepository(): PasswordRepository {
  const provided = useAdapters().passwordRepository
  if (provided) {
    return provided
  }
  defaultRepository ??= useRuntimeConfig().databaseUrl
    ? new MysqlPasswordRepository(useDatabase())
    : missingAdapter<PasswordRepository>('Passwords need NUXT_DATABASE_URL, or a passwordRepository from provideAdapters')
  return defaultRepository
}

/** Attempts per client address, across accounts, to slow credential stuffing. */
export const ADDRESS_SIGN_IN_ATTEMPTS: RateRule = { limit: 20, windowMs: 15 * 60 * 1000 }

/**
 * Counts one attempt at `action` from the client's address, or throws once
 * the address is over the rule. Behind a proxy, set NUXT_TRUST_PROXY, or
 * every client shares the proxy's address and one bucket.
 */
export async function limitByAddress(event: H3Event, action: string, rule: RateRule): Promise<void> {
  const address = getRequestIP(event, { xForwardedFor: useRuntimeConfig().trustProxy }) ?? 'unknown'
  const key = `address:${action}:${address}`
  const { rateLimiter } = useAdapters()
  const wait = await rateLimiter.retryAfter(key, rule)
  if (wait > 0) {
    throw new TooManyAttemptsError(wait)
  }
  await rateLimiter.hit(key, rule)
}

/**
 * The app's own origin, for links in emails. Built from configuration, never
 * the Host header, which a caller controls: a forged Host would mail the
 * victim a link to the attacker's site carrying a live token.
 */
export function appOrigin(event: H3Event): string {
  const configured = useRuntimeConfig().appUrl
  if (configured) {
    return configured.replace(/\/$/, '')
  }
  if (import.meta.dev) {
    return getRequestURL(event).origin
  }
  throw new Error('NUXT_APP_URL is not set, so emailed links have nowhere to point')
}

/** Builds set-password links, reading the origin only when a link is made. */
export const setPasswordUrl = (event: H3Event) =>
  (token: string) => `${appOrigin(event)}/reset-password?token=${encodeURIComponent(token)}`
