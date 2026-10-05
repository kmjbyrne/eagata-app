export interface IdGenerator {
  /** A new id, unique across every entity. */
  next(): string
}
