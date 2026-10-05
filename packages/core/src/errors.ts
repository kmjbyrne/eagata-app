/** The base of every error the domain throws on purpose. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

/** Input that breaks a rule of its own, such as a malformed email. */
export class InvalidInputError extends DomainError {}

/** Also thrown for things that exist but the caller may not see, so it never reveals them. */
export class NotFoundError extends DomainError {}

export class NotSignedInError extends DomainError {
  constructor() {
    super('Sign in required')
  }
}

export class ForbiddenError extends DomainError {}

/** The request conflicts with what is already stored. Adapters map these to 409. */
export class ConflictError extends DomainError {}

export class SlugTakenError extends ConflictError {
  constructor(readonly slug: string) {
    super(`The slug "${slug}" is taken`)
  }
}

export class EmailTakenError extends ConflictError {
  constructor(readonly email: string) {
    super(`A user already has the email "${email}"`)
  }
}

export class AlreadyMemberError extends ConflictError {
  constructor(readonly of: 'organization' | 'workspace') {
    super(`That user is already a member of this ${of}`)
  }
}

export class IdentityInUseError extends ConflictError {
  constructor(readonly provider: string) {
    super(`This ${provider} account is already linked to another user`)
  }
}

export class LastOwnerError extends ConflictError {
  constructor(readonly of: 'organization' | 'workspace') {
    super(`A${of === 'organization' ? 'n' : ''} ${of} needs at least one owner. Make someone else an owner first`)
  }
}

export class LastPlatformAdminError extends ConflictError {
  constructor() {
    super('The platform needs at least one platform admin. Make someone else a platform admin first')
  }
}

/** The provider hasn't verified the email, so it can't create or claim an account. */
export class EmailNotVerifiedError extends DomainError {
  constructor(readonly email: string) {
    super(`${email} isn't verified with the sign-in provider`)
  }
}

/**
 * The email belongs to a user already linked to a different account at the
 * same provider. Linking a second one could hand the user to whoever the
 * provider has since given the email to.
 */
export class IdentityMismatchError extends ConflictError {
  constructor(readonly provider: string) {
    super(`This email is linked to a different ${provider} account`)
  }
}
