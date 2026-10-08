import { getRequestHeader, getRequestIP, type H3Event } from 'h3'

/**
 * The client's address. With `trustProxy`, the last X-Forwarded-For entry,
 * which the proxy in front of the app appended. Entries before it are
 * whatever the client sent, so trusting them would let anyone pick a fresh
 * address per request. Assumes exactly one proxy hop.
 */
export function clientAddress(event: H3Event, trustProxy: boolean): string | undefined {
  if (trustProxy) {
    const forwarded = getRequestHeader(event, 'x-forwarded-for')?.split(',').at(-1)?.trim()
    if (forwarded) {
      return forwarded
    }
  }
  return getRequestIP(event)
}
