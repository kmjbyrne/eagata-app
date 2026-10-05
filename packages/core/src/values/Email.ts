import { InvalidInputError } from '../errors'

export type Email = string & { readonly __brand: 'Email' }

export const EMAIL_MAX_LENGTH = 255

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
