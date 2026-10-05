import { ForbiddenError, InvalidInputError, NotSignedInError } from '../errors'

/** The same answer for an unknown email and a wrong password, so neither is revealed. */
export class InvalidCredentialsError extends NotSignedInError {
  constructor() {
    super('Invalid email or password')
  }
}

/** Changing a password needs the current one, and this wasn't it. */
export class WrongPasswordError extends ForbiddenError {
  constructor() {
    super('That isn\'t your current password')
  }
}

export class InvalidResetTokenError extends InvalidInputError {
  constructor() {
    super('This link is invalid, used or expired. Ask for a new one.')
  }
}
