import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../campaign/runReducer'
import { testCreateCharacter } from '../stats/testFixtures'
import { evaluateMilestones, syncCompletedMilestones } from './evaluateMilestones'

describe('evaluateMilestones', () => {
  const base = initialCampaignState()

  it('milestone_world_power_10 when worldPower >= 10', () => {
    const ids = evaluateMilestones({ ...base, worldPower: 10 })
    expect(ids).toContain('milestone_world_power_10')
  })

  it('milestone_hire_second when two characters', () => {
    const ally = testCreateCharacter({ id: 'ally-2', name: 'Союзник', classId: 'rogue' })
    const ids = evaluateMilestones({ ...base, characters: [...base.characters, ally] })
    expect(ids).toContain('milestone_hire_second')
  })

  it('milestone_first_mod when a card has filled mod with lm > 0', () => {
    const hero = base.characters[0]!
    const cardWithMod = {
      ...hero.cards[0]!,
      modSlots: [{ status: 'filled' as const, templateId: 'mod_damage', lm: 1 }],
    }
    const ids = evaluateMilestones({
      ...base,
      characters: [{ ...hero, cards: [cardWithMod] }],
    })
    expect(ids).toContain('milestone_first_mod')
  })

  it('does not include milestone_first_mod when mod lm is 0', () => {
    const hero = base.characters[0]!
    const cardWithMod = {
      ...hero.cards[0]!,
      modSlots: [{ status: 'filled' as const, templateId: 'mod_damage', lm: 0 }],
    }
    const ids = evaluateMilestones({
      ...base,
      characters: [{ ...hero, cards: [cardWithMod] }],
    })
    expect(ids).not.toContain('milestone_first_mod')
  })
})

describe('syncCompletedMilestones', () => {
  it('merges newly evaluated milestones into campaign state', () => {
    const base = initialCampaignState()
    const next = syncCompletedMilestones({ ...base, worldPower: 10 })
    expect(next.completedMilestones).toContain('milestone_world_power_10')
  })

  it('returns same reference when nothing new to merge', () => {
    const base = initialCampaignState()
    const withMilestone = {
      ...base,
      completedMilestones: ['milestone_world_power_10' as const],
      worldPower: 10,
    }
    expect(syncCompletedMilestones(withMilestone)).toBe(withMilestone)
  })
})
