import { describe, expect, it } from 'vitest'
import { FLOAT_READ_MS, getPresetDurationMs, hasFloatText } from './presetRegistry'
import type { AnimationStep } from './types'

describe('hasFloatText', () => {
  it('is true for strike with damage', () => {
    expect(hasFloatText({
      kind: 'strike_melee',
      attackerId: 'h',
      targetId: 'e',
      damage: 5,
    })).toBe(true)
  })

  it('is false for move', () => {
    expect(hasFloatText({
      kind: 'move',
      unitId: 'h',
      from: { x: 0, y: 0 },
      to: { x: 1, y: 0 },
    })).toBe(false)
  })

  it('is false for aoe without damage', () => {
    expect(hasFloatText({
      kind: 'aoe_burst',
      center: { x: 1, y: 1 },
      cellKeys: ['1,1'],
    })).toBe(false)
  })
})

describe('getPresetDurationMs with float', () => {
  it('returns FLOAT_READ_MS for strike_melee', () => {
    expect(getPresetDurationMs({
      kind: 'strike_melee',
      attackerId: 'h',
      targetId: 'e',
      damage: 3,
    }, false)).toBe(FLOAT_READ_MS)
  })

  it('returns 280 for move unchanged', () => {
    expect(getPresetDurationMs({
      kind: 'move',
      unitId: 'h',
      from: { x: 0, y: 0 },
      to: { x: 1, y: 0 },
    }, false)).toBe(280)
  })

  it('returns FLOAT_READ_MS for heal', () => {
    expect(getPresetDurationMs({
      kind: 'heal',
      healerId: 'h',
      targetId: 'h',
      amount: 5,
    }, false)).toBe(FLOAT_READ_MS)
  })
})

describe('getPresetDurationMs', () => {
  it('returns 280 for move when motion enabled', () => {
    const step: AnimationStep = {
      kind: 'move',
      unitId: 'h1',
      from: { x: 0, y: 0 },
      to: { x: 1, y: 0 },
    }
    expect(getPresetDurationMs(step, false)).toBe(280)
  })

  it('returns 0 when reduced motion', () => {
    const step: AnimationStep = {
      kind: 'death',
      unitId: 'e1',
      at: { x: 2, y: 0 },
    }
    expect(getPresetDurationMs(step, true)).toBe(0)
  })

  it('returns 600 for aoe_burst', () => {
    const step: AnimationStep = {
      kind: 'aoe_burst',
      center: { x: 1, y: 1 },
      cellKeys: ['1,1'],
    }
    expect(getPresetDurationMs(step, false)).toBe(600)
  })
})
