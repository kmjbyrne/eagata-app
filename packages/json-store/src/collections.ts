import type { z } from 'zod'

/** Every stored document has a string id, unique within its collection. */
export interface JsonDocument {
  id: string
}

export interface CollectionDefinition<T extends JsonDocument = JsonDocument> {
  /** Checks every document written, and every document read from a file. */
  schema: z.ZodType<T>
  /** The documents a missing or empty collection starts with. */
  seed?: () => T[]
}

export type CollectionDefinitions = Record<string, CollectionDefinition<JsonDocument>>

/** The document type of each collection, by name. */
export type DocumentsOf<C extends CollectionDefinitions> = {
  [K in keyof C]: C[K] extends CollectionDefinition<infer T> ? T : never
}

/** The file keeps its own bookkeeping under this key. */
export const META_KEY = '_meta'

export class CollectionNameError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CollectionNameError'
  }
}

function checkName(name: string): void {
  if (!name || name === META_KEY) {
    throw new CollectionNameError(`"${name}" cannot be a collection name`)
  }
}

export function defineCollections<C extends CollectionDefinitions>(definitions: C): C {
  Object.keys(definitions).forEach(checkName)
  return definitions
}

type UnionToIntersection<U> = (U extends unknown ? (u: U) => void : never) extends (i: infer I) => void ? I : never

/**
 * Joins collections defined in separate places, such as shared ones and an
 * app's own. Two sets defining the same name is a mistake, so it throws.
 */
export function combineCollections<S extends CollectionDefinitions[]>(...sets: S): UnionToIntersection<S[number]> & CollectionDefinitions {
  const combined: CollectionDefinitions = {}
  for (const set of sets) {
    for (const [name, definition] of Object.entries(set)) {
      checkName(name)
      if (name in combined) {
        throw new CollectionNameError(`Collection "${name}" is defined twice`)
      }
      combined[name] = definition
    }
  }
  return combined as UnionToIntersection<S[number]> & CollectionDefinitions
}
