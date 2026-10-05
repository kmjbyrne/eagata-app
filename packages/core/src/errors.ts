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
