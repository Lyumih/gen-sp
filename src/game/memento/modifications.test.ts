import { describe, it, expect } from 'vitest'
import { modSlotsUnlocked } from './modifications'
import { applyCardUse } from './cardProgress'

describe('modSlotsUnlocked', () => {
  it('matches floor(cardLevel / 75)', () => {
    expect(modSlotsUnlocked(0)).toBe(0)
    expect(modSlotsUnlocked(74)).toBe(0)
    expect(modSlotsUnlocked(75)).toBe(1)
    expect(modSlotsUnlocked(149)).toBe(1)
    expect(modSlotsUnlocked(150)).toBe(2)
  })
})

describe('applyCardUse', () => {
  it('always increments uses_count', () => {
    const card = { global_level: 50, uses_count: 3 }
    const next = applyCardUse(card, 49)
    expect(next.uses_count).toBe(4)
    expect(card.uses_count).toBe(3)
  })

  it('increments global_level when roll succeeds', () => {
    const card = { global_level: 1, uses_count: 0 }
    const next = applyCardUse(card, 50)
    expect(next.global_level).toBe(2)
    expect(next.leveledUp).toBe(true)
  })

  it('does not increment global_level when roll fails', () => {
    const card = { global_level: 50, uses_count: 0 }
    const next = applyCardUse(card, 48)
    expect(next.global_level).toBe(50)
    expect(next.leveledUp).toBe(false)
  })
})
