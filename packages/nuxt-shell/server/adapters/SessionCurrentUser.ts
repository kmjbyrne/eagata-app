import type { CurrentUser, UserId } from '@kmjbyrne/core'
import type { H3Event } from 'h3'

declare module 'h3' {
  interface H3EventContext {
    /** Who the session says is making the request. Set by the actor middleware. */
    actor?: { id: UserId }
  }
}

export class SessionCurrentUser implements CurrentUser {
  constructor(private readonly event: H3Event) {}

  get userId(): UserId | null {
    return this.event.context.actor?.id ?? null
  }
}
