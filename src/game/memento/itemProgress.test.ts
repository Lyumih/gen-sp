import { describe, expect, it } from 'vitest'
import { MOD_SLOT_MILESTONES } from '../config/modSlotMilestones'
import { applyItemUseRoll } from './itemProgress'

describe('applyItemUseRoll', () => {
  it('increments itemLevel on successful roll', () => {
    const item = { id: 'w1', templateId: 'wooden_sword', itemLevel: 50, modSlots: [] }
    const result = applyItemUseRoll(item, 50)
    expect(result.itemLevel).toBe(51)
    expect(result.leveledUp).toBe(true)
  })

  it('does not increment itemLevel on failed roll', () => {
    const item = { id: 'w1', templateId: 'wooden_sword', itemLevel: 50, modSlots: [] }
    const result = applyItemUseRoll(item, 49)
    expect(result.itemLevel).toBe(50)
    expect(result.leveledUp).toBe(false)
  })

  it('syncs mod slots when level crosses milestone', () => {
    const threshold = MOD_SLOT_MILESTONES.firstThreshold
    const item = {
      id: 'a1',
      templateId: 'leather_armor',
      itemLevel: threshold - 1,
      modSlots: [],
    }
    const result = applyItemUseRoll(item, 100)
    expect(result.itemLevel).toBe(threshold)
    expect(result.modSlots).toHaveLength(1)
    expect(result.modSlots[0]?.status).toBe('empty')
    expect(result.modSlots[0]?.status === 'empty' ? result.modSlots[0].offer : null).not.toBeNull()
  })
})
