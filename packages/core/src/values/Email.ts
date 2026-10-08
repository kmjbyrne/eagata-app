import { InvalidInputError } from '../errors'

export type Email = string & { readonly __brand: 'Email' }

export const EMAIL_MAX_LENGTH = 255

/**
 * Printable ASCII only, so no two emails differ by an accent or a look-alike
 * letter that a database collation or a person might read as the same. An
 * internationalised domain is accepted in its `xn--` form.
 */
const EMAIL_PATTERN = /^[\x21-\x3F\x41-\x7E]+@[\x21-\x3F\x41-\x7E]+\.[\x21-\x3F\x41-\x7E]+$/

export class InvalidEmailError extends InvalidInputError {
  constructor(readonly input: string) {
    super(`Invalid email: "${input}"`)
  }
}

export function parseEmail(input: string): Email {
  const candidate = input.trim().toLowerCase()
  if (candidate.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(candidate)) {
    throw new InvalidEmailError(input)
  }
  return candidate as Email
}
