import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { CollectionNameError, combineCollections, defineCollections } from './collections'

const schema = z.object({ id: z.string() })

describe('defineCollections', () => {
  it.each(['', '_meta'])('rejects the name "%s"', (name) => {
    expect(() => defineCollections({ [name]: { schema } })).toThrow(CollectionNameError)
  })
})

describe('combineCollections', () => {
  it('joins sets with different names', () => {
    const combined = combineCollections(defineCollections({ a: { schema } }), defineCollections({ b: { schema } }))

    expect(Object.keys(combined)).toEqual(['a', 'b'])
  })

  it('rejects a name defined in two sets', () => {
    expect(() => combineCollections(defineCollections({ a: { schema } }), defineCollections({ a: { schema } })))
      .toThrow('Collection "a" is defined twice')
  })
})
