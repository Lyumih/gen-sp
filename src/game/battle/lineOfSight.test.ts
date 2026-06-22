import { describe, expect, it } from 'vitest'
import { cellKey } from './grid'
import { hasLineOfSight } from './lineOfSight'

describe('hasLineOfSight', () => {
  it('boss-lite flank shot from (1,1) to boss at (4,2)', () => {
    const walls = new Set([cellKey(2, 2)])
    expect(hasLineOfSight(1, 1, 4, 2, walls)).toBe(true)
  })

  it('boss-lite direct shot blocked from spawn', () => {
    const walls = new Set([cellKey(2, 2)])
    expect(hasLineOfSight(0, 2, 4, 2, walls)).toBe(false)
  })

  it('boss-lite flank shots', () => {
    const walls = new Set([cellKey(2, 2)])
    expect(hasLineOfSight(0, 1, 4, 2, walls)).toBe(true)
    expect(hasLineOfSight(1, 1, 4, 2, walls)).toBe(true)
  })

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
