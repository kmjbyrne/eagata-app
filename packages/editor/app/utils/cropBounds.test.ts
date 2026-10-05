import { describe, expect, it } from 'vitest'
import { contains, fitInside, intersect } from './cropBounds'

describe('intersect', () => {
  it('returns the overlap', () => {
    expect(intersect({ x: 0, y: 0, width: 100, height: 100 }, { x: 50, y: -20, width: 100, height: 60 }))
      .toEqual({ x: 50, y: 0, width: 50, height: 40 })
  })

  it('returns null when the rectangles do not overlap', () => {
    expect(intersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 0, width: 10, height: 10 })).toBeNull()
  })
})

describe('contains', () => {
  const outer = { x: 0, y: 0, width: 100, height: 50 }

  it('accepts a rectangle inside, with rounding slack', () => {
    expect(contains(outer, { x: -0.3, y: 10, width: 100.3, height: 20 })).toBe(true)
  })

  it('rejects a rectangle that spills over an edge', () => {
    expect(contains(outer, { x: 10, y: 10, width: 100, height: 20 })).toBe(false)
  })
})

describe('fitInside', () => {
  const bounds = { x: 100, y: 0, width: 400, height: 200 }

  it('fills the bounds for any shape', () => {
    expect(fitInside(bounds, Number.NaN)).toEqual(bounds)
  })

  it('fits a square into a wide area, centred', () => {
    expect(fitInside(bounds, 1)).toEqual({ x: 200, y: 0, width: 200, height: 200 })
  })

  it('fits a wide shape into a tall area, centred', () => {
    expect(fitInside({ x: 0, y: 0, width: 160, height: 400 }, 16 / 9)).toEqual({ x: 0, y: 155, width: 160, height: 90 })
  })

  it('applies coverage around the centre', () => {
    expect(fitInside({ x: 0, y: 0, width: 100, height: 100 }, 1, 0.9)).toEqual({ x: 5, y: 5, width: 90, height: 90 })
  })
})
