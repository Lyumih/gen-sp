import { describe, expect, it } from 'vitest'
import { createCharacter } from '../character/createCharacter'
import { STARTER_HERO_BASE_STATS } from '../config/baseStats'
import { computeBaseStatRating } from '../stats/computeRating'
import { maxSkillLoadoutSlots, maxPassiveEquipSlots } from './loadoutCaps'
import { effectiveMilestoneThreshold } from './milestones'
import { milestoneThreshold } from '../memento/modSlots'

const baseChar = createCharacter({
  id: 'x',
  name: 'x',
  classId: 'warrior',
  baseStats: STARTER_HERO_BASE_STATS,
  baseStatRating: computeBaseStatRating(STARTER_HERO_BASE_STATS),
})

describe('loadoutCaps', () => {
  it('base 3 skill / 4 passive slots', () => {
    expect(maxSkillLoadoutSlots(baseChar)).toBe(3)
    expect(maxPassiveEquipSlots(baseChar)).toBe(4)
  })

  it('slot_skill_plus → 4 skill slots', () => {
    const ch = { ...baseChar, specializationId: 'slot_skill_plus' as const }
    expect(maxSkillLoadoutSlots(ch)).toBe(4)
  })
})

describe('milestones', () => {
  it('mod_early_slot lowers first threshold in prod', () => {
    const ch = { ...baseChar, specializationId: 'mod_early_slot' as const }
    const t0 = effectiveMilestoneThreshold(ch, 0, milestoneThreshold)
    if (import.meta.env.DEV) {
      expect(t0).toBe(4)
    } else {
      expect(t0).toBe(60)
    }
  })
})
