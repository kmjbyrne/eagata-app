import { describe, expect, it } from 'vitest'
import {
  AccountDeactivatedError,
  AlreadyMemberError,
  EmailNotVerifiedError,
  EmailTakenError,
  ForbiddenError,
  IdentityMismatchError,
  InvalidEmailError,
  InvalidSlugError,
  LastOwnerError,
  LastPlatformAdminError,
  NotFoundError,
  NotSignedInError,
  SlugTakenError
} from '@kmjbyrne/core'
import { domainErrorStatus } from './errors'

describe('domainErrorStatus', () => {
  it.each([
    [new InvalidEmailError('x'), 400],
    [new InvalidSlugError('x'), 400],
    [new NotSignedInError(), 401],
    [new ForbiddenError('no'), 403],
    [new EmailNotVerifiedError('a@example.com'), 403],
    [new AccountDeactivatedError(), 403],
    [new NotFoundError('gone'), 404],
    [new SlugTakenError('acme'), 409],
    [new EmailTakenError('a@example.com'), 409],
    [new AlreadyMemberError('workspace'), 409],
    [new IdentityMismatchError('google'), 409],
    [new LastOwnerError('organization'), 409],
    [new LastPlatformAdminError(), 409]
  ])('maps %s to %i', (error, status) => {
    expect(domainErrorStatus(error)).toBe(status)
  })

  it('leaves other errors alone', () => {
    expect(domainErrorStatus(new Error('boom'))).toBeUndefined()
  })
})
