import { describe, expect, it } from 'vitest'
import { scaleModValue } from './modScaling'

describe('scaleModValue', () => {
  it('doubles percent base at lm 100', () => {
    expect(scaleModValue(50, 100, 'percent')).toBe(100)
  })
  it('scales flat base at lm 100', () => {
    expect(scaleModValue(1, 100, 'flat')).toBe(2)
  })
})
