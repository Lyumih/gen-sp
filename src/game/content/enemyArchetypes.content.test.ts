import { describe, expect, it } from 'vitest'
import { ENEMY_ARCHETYPE_IDS, getEnemyArchetype } from './enemyArchetypes'
import { getCardAttackTemplate } from './cardTemplates'
import { getPassiveTemplate } from './passiveTemplates'

describe('enemy archetype content', () => {
  it('every archetype has valid skills and passives', () => {
    for (const id of ENEMY_ARCHETYPE_IDS) {
      const a = getEnemyArchetype(id)!
      expect(a.skillPresets.length).toBeLessThanOrEqual(4)
      expect(a.passivePresets.length).toBeLessThanOrEqual(4)
      for (const s of a.skillPresets) {
        expect(getCardAttackTemplate(s.templateId), id).toBeDefined()
      }
      for (const p of a.passivePresets) {
        expect(getPassiveTemplate(p.templateId), id).toBeDefined()
      }
    }
  })

  it('every skilled archetype can cast its cheapest skill at battle start', () => {
    for (const id of ENEMY_ARCHETYPE_IDS) {
      const archetype = getEnemyArchetype(id)!
      if (archetype.skillPresets.length === 0) continue
      const cheapestCost = Math.min(
        ...archetype.skillPresets.map(
          ({ templateId }) => getCardAttackTemplate(templateId)!.manaCost,
        ),
      )

      expect.soft(archetype.baseStats.mana, id).toBeGreaterThanOrEqual(cheapestCost)
    }
  })

  it('has exactly 16 regular, 8 boss, 3 chaotic, 4 hero', () => {
    const all = ENEMY_ARCHETYPE_IDS.map((id) => getEnemyArchetype(id)!)
    expect(all.filter((a) => a.isBoss).length).toBe(8)
    expect(all.filter((a) => a.isChaotic).length).toBe(3)
    expect(all.filter((a) => a.threatTags.includes('hero')).length).toBe(4)
    expect(all.filter((a) => !a.isBoss).length).toBe(23) // 16 + 3 mutants + 4 hero
  })
})
