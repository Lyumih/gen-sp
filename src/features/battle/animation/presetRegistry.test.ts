import { describe, expect, it } from 'vitest'
import { getPresetDurationMs } from './presetRegistry'
import type { AnimationStep } from './types'

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
