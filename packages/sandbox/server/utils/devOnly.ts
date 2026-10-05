import type { EventHandler, EventHandlerRequest } from 'h3'

/** A sandbox route: 404 outside a dev server, as a second guard behind the startup check. */
export function defineSandboxHandler<T>(handler: EventHandler<EventHandlerRequest, Promise<T>>) {
  return defineEventHandler(async (event) => {
    if (!import.meta.dev) {
      throw createError({ statusCode: 404 })
    }
    return handler(event)
  })
}
