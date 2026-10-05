export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** The overlap of two rectangles, or null when they don't overlap. */
export function intersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const width = Math.min(a.x + a.width, b.x + b.width) - x
  const height = Math.min(a.y + a.height, b.y + b.height) - y
  return width > 0 && height > 0 ? { x, y, width, height } : null
}

/** Whether inner lies inside outer, allowing half a pixel of rounding. */
export function contains(outer: Rect, inner: Rect): boolean {
  const slack = 0.5
  return inner.x >= outer.x - slack
    && inner.y >= outer.y - slack
    && inner.x + inner.width <= outer.x + outer.width + slack
    && inner.y + inner.height <= outer.y + outer.height + slack
}

/**
 * The largest rectangle of the given aspect ratio (width / height; NaN for
 * any shape) that fits inside bounds, scaled by coverage and centred.
 */
export function fitInside(bounds: Rect, aspectRatio: number, coverage = 1): Rect {
  let width = bounds.width
  let height = bounds.height
  if (aspectRatio > 0) {
    if (width / height > aspectRatio) {
      width = height * aspectRatio
    } else {
      height = width / aspectRatio
    }
  }
  width *= coverage
  height *= coverage
  return {
    x: bounds.x + (bounds.width - width) / 2,
    y: bounds.y + (bounds.height - height) / 2,
    width,
    height
  }
}
