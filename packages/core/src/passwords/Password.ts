import { InvalidInputError } from '../errors'

export type Password = string & { readonly __brand: 'Password' }

export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_LENGTH = 256

export class InvalidPasswordError extends InvalidInputError {
  constructor() {
    super(`Passwords must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters long`)
  }
}

/** Length is the only rule, per NIST SP 800-63B. Spaces count and are kept. */
export function parsePassword(input: string): Password {
  if (input.length < PASSWORD_MIN_LENGTH || input.length > PASSWORD_MAX_LENGTH) {
    throw new InvalidPasswordError()
  }
  return input as Password
}
