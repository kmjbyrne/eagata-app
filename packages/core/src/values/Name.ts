import { InvalidInputError } from '../errors'

/** A display name for a person, an organization or a workspace. */
export type Name = string & { readonly __brand: 'Name' }

export const NAME_MAX_LENGTH = 100

export class InvalidNameError extends InvalidInputError {
  constructor(readonly input: string) {
    super(`A name needs 1 to ${NAME_MAX_LENGTH} characters, got "${input}"`)
  }
}

/** Trims and collapses inner whitespace, so names compare and sort as people expect. */
export function parseName(input: string): Name {
  const candidate = input.trim().replace(/\s+/g, ' ')
  if (!candidate || candidate.length > NAME_MAX_LENGTH) {
    throw new InvalidNameError(input)
  }
  return candidate as Name
}
