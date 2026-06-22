import { describe, expect, it } from 'vitest'
import type { ModOffer } from '../types'
import {
  milestoneThreshold,
  unlockedSlotCount,
  rollbackCarrierLevel,
  syncModSlotsForLevel,
} from './modSlots'
import { MOD_SLOT_MILESTONES } from '../config/modSlotMilestones'

describe('milestoneThreshold', () => {
  it('uses firstThreshold + step * slotIndex', () => {
    const t0 = milestoneThreshold(0)
    const t1 = milestoneThreshold(1)
    expect(t1 - t0).toBe(MOD_SLOT_MILESTONES.step)
  })
})

describe('unlockedSlotCount', () => {
  it('returns 0 below first threshold', () => {
    expect(unlockedSlotCount(MOD_SLOT_MILESTONES.firstThreshold - 1)).toBe(0)
  })
  it('returns 1 at first threshold', () => {
    expect(unlockedSlotCount(MOD_SLOT_MILESTONES.firstThreshold)).toBe(1)
  })
})

describe('rollbackCarrierLevel', () => {
  it('returns 0 when removing slot 0', () => {
    expect(rollbackCarrierLevel(0)).toBe(0)
  })
  it('returns previous milestone for slot 1', () => {
    expect(rollbackCarrierLevel(1)).toBe(milestoneThreshold(0))
  })
})

describe('syncModSlotsForLevel', () => {
  const offer: ModOffer = { modIds: ['a', 'b', 'c'], rollSeed: 1 }

  it('adds empty slot with offer when level crosses milestone', () => {
    const threshold = milestoneThreshold(0)
    const next = syncModSlotsForLevel([], threshold, () => offer)
    expect(next).toHaveLength(1)
    expect(next[0]).toEqual({ status: 'empty', offer })
  })

  it('preserves filled slots when level increases', () => {
    const filled = { status: 'filled' as const, templateId: 'mod-damage-up', lm: 3 }
    const threshold = milestoneThreshold(1)
    const next = syncModSlotsForLevel([filled], threshold, () => offer)
    expect(next[0]).toEqual(filled)
    expect(next.length).toBeGreaterThanOrEqual(2)
  })
})
