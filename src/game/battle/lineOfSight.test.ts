import { describe, expect, it } from 'vitest'
import { cellKey } from './grid'
import { hasLineOfSight } from './lineOfSight'

describe('hasLineOfSight', () => {
  it('returns true for adjacent cells', () => {
    expect(hasLineOfSight(0, 0, 1, 0, new Set())).toBe(true)
  })

  it('returns false when wall blocks the line', () => {
    const walls = new Set([cellKey(1, 0)])
    expect(hasLineOfSight(0, 0, 2, 0, walls)).toBe(false)
  })

  it('returns true when wall is not on the line', () => {
    const walls = new Set([cellKey(0, 1)])
    expect(hasLineOfSight(0, 0, 2, 0, walls)).toBe(true)
  })
})
