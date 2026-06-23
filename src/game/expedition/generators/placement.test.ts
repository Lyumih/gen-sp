import { describe, expect, it } from 'vitest'
import { rollFieldDimensions, makeRng, rollInt } from './placement'

describe('rollFieldDimensions', () => {
  it('never returns 1x1', () => {
    const rng = makeRng(42, 'dims')
    for (let i = 0; i < 50; i++) {
      const { width, height } = rollFieldDimensions(rng, 1, 20)
      expect(width * height).toBeGreaterThan(1)
    }
  })
})

describe('rollInt', () => {
  it('is deterministic for same seed', () => {
    const a = rollInt(makeRng(1, 'x'), 1, 10)
    const b = rollInt(makeRng(1, 'x'), 1, 10)
    expect(a).toBe(b)
  })
})
