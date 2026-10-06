import {
  AccountDeactivatedError,
  ConflictError,
  DomainError,
  EmailNotVerifiedError,
  ForbiddenError,
  InvalidInputError,
  NotFoundError,
  NotInvitedError,
  NotSignedInError,
  TooManyAttemptsError
} from '@kmjbyrne/core'
import type { EventHandlerRequest, H3Event } from 'h3'

/** The HTTP status for an error the domain threw on purpose, or undefined for anything else. */
export function domainErrorStatus(error: unknown): number | undefined {
  if (!(error instanceof DomainError)) {
    return undefined
  }
  if (error instanceof NotSignedInError) {
    return 401
  }
  if (error instanceof ForbiddenError || error instanceof EmailNotVerifiedError || error instanceof AccountDeactivatedError || error instanceof NotInvitedError) {
    return 403
  }
  if (error instanceof NotFoundError) {
    return 404
  }
  if (error instanceof ConflictError) {
    return 409
  }
  if (error instanceof TooManyAttemptsError) {
    return 429
  }
  if (error instanceof InvalidInputError) {
    return 400
  }
  return 400
}

/**
 * Every route is defined with this. Domain errors become responses with the
 * matching status, the message, and the error's name in `data.error`, so a
 * page can tell "slug taken" from "not found". Anything else stays a 500.
 */
export function defineServiceHandler<T>(handler: (event: H3Event<EventHandlerRequest>) => Promise<T>) {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event)
    } catch (error) {
      const statusCode = domainErrorStatus(error)
      if (statusCode === undefined) {
        throw error
      }
      // An expected refusal, such as not found or not signed in: a warning
      // in the request log, not an error. Unmapped errors stay errors.
      event.context.log?.setLevel('warn')
      throw createError({ statusCode, message: (error as Error).message, data: { error: (error as Error).name } })
    }
  })
}

/**
 * For routes the browser navigates to rather than fetches, such as sign-in and
 * its callback: any failure lands on a page, never a JSON error. The error is
 * still logged, as a warning when it's an expected refusal.
 */
export function defineNavigationHandler<T>(
  handler: (event: H3Event<EventHandlerRequest>) => Promise<T>,
  fallback: (error: unknown) => string
) {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event)
    } catch (error) {
      const log = event.context.log
      if (log) {
        log.error(error as Error)
        if (domainErrorStatus(error) !== undefined) {
          log.setLevel('warn')
        }
      } else {
        console.error(error)
      }
      return sendRedirect(event, fallback(error))
    }
  })
}
