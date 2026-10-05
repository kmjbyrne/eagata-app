import { InvalidInputError } from '../errors'

export type UserId = string & { readonly __brand: 'UserId' }
export type OrgId = string & { readonly __brand: 'OrgId' }
export type WorkspaceId = string & { readonly __brand: 'WorkspaceId' }

const ID_MAX_LENGTH = 64

function parseId(kind: string, input: string): string {
  if (!input || input.length > ID_MAX_LENGTH) {
    throw new InvalidInputError(`Invalid ${kind} id: "${input}"`)
  }
  return input
}

export const parseUserId = (input: string) => parseId('user', input) as UserId
export const parseOrgId = (input: string) => parseId('org', input) as OrgId
export const parseWorkspaceId = (input: string) => parseId('workspace', input) as WorkspaceId
