import { describe, expect, it } from 'vitest'
import { applyVictoryModRollsToCarrier } from './applyVictoryModRolls'

describe('applyVictoryModRollsToCarrier', () => {
  it('increments lm independently for two filled slots on successful rolls', () => {
    const carrier = {
      modSlots: [
        { status: 'filled' as const, templateId: 'mod-a', lm: 0 },
        { status: 'filled' as const, templateId: 'mod-b', lm: 2 },
      ],
    }
    const result = applyVictoryModRollsToCarrier(carrier, (i) => (i === 0 ? 100 : 1))
    expect(result.modSlots[0]).toEqual({ status: 'filled', templateId: 'mod-a', lm: 1 })
    expect(result.modSlots[1]).toEqual({ status: 'filled', templateId: 'mod-b', lm: 2 })
  })

  it('increments both slots when rolls succeed', () => {
    const carrier = {
      modSlots: [
        { status: 'filled' as const, templateId: 'mod-a', lm: 0 },
        { status: 'filled' as const, templateId: 'mod-b', lm: 0 },
      ],
    }
    const result = applyVictoryModRollsToCarrier(carrier, () => 100)
    expect(result.modSlots[0]).toEqual({ status: 'filled', templateId: 'mod-a', lm: 1 })
    expect(result.modSlots[1]).toEqual({ status: 'filled', templateId: 'mod-b', lm: 1 })
  })

  it('skips empty slots', () => {
    const carrier = {
      modSlots: [
        { status: 'empty' as const, offer: null },
        { status: 'filled' as const, templateId: 'mod-a', lm: 0 },
      ],
    }
    const result = applyVictoryModRollsToCarrier(carrier, () => 100)
    expect(result.modSlots[0]).toEqual({ status: 'empty', offer: null })
    expect(result.modSlots[1]).toEqual({ status: 'filled', templateId: 'mod-a', lm: 1 })
  })
})
