import type { IdGenerator } from '../ports/IdGenerator'

/** Predictable ids for tests: id-1, id-2... */
export class SequentialIdGenerator implements IdGenerator {
  private count = 0

  next(): string {
    return `id-${++this.count}`
  }
}
