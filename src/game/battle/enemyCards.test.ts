import { describe, expect, it } from 'vitest'
import { getEnemyArchetype } from '../content/enemyArchetypes'
import { enemyCardsFromArchetype, enemyPassivesFromArchetype } from './enemyCards'

describe('enemyCardsFromArchetype', () => {
  it('maps skillPresets to BattlePlayerCard with stable ids and zero cooldown', () => {
    const archetype = getEnemyArchetype('enemy_orc_ravager')!
    const cards = enemyCardsFromArchetype(archetype, 'e-ravager')

    expect(cards).toHaveLength(3)
    expect(cards.map((c) => c.templateId)).toEqual(['frenzy', 'whirlwind', 'monster_roar'])
    expect(cards.map((c) => c.global_level)).toEqual([3, 3, 2])
    expect(cards.map((c) => c.id)).toEqual([
      'e-ravager-skill-0',
      'e-ravager-skill-1',
      'e-ravager-skill-2',
    ])
    expect(cards.every((c) => c.cooldownRemaining === 0)).toBe(true)
    expect(cards.every((c) => c.uses_count === 0)).toBe(true)
  })

  it('returns empty array when archetype has no skill presets', () => {
    const archetype = getEnemyArchetype('grunt')!
    expect(enemyCardsFromArchetype(archetype, 'e1')).toEqual([])
  })
})

describe('enemyPassivesFromArchetype', () => {
  it('maps passivePresets to PassiveInstance with stable ids', () => {
    const archetype = getEnemyArchetype('grunt')!
    const withPassives = {
      ...archetype,
      passivePresets: [
        { templateId: 'enemy_rage_trait', global_level: 2, modSlots: [] },
        { templateId: 'enemy_holy_ward', global_level: 1, modSlots: [] },
      ],
    }
    const passives = enemyPassivesFromArchetype(withPassives, 'e1')

    expect(passives).toHaveLength(2)
    expect(passives.map((p) => p.templateId)).toEqual(['enemy_rage_trait', 'enemy_holy_ward'])
    expect(passives.map((p) => p.id)).toEqual(['e1-passive-0', 'e1-passive-1'])
    expect(passives.every((p) => p.uses_count === 0)).toBe(true)
  })
})
