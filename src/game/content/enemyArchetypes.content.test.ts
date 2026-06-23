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

  it('has exactly 16 regular, 8 boss, 3 chaotic', () => {
    const all = ENEMY_ARCHETYPE_IDS.map((id) => getEnemyArchetype(id)!)
    expect(all.filter((a) => a.isBoss).length).toBe(8)
    expect(all.filter((a) => a.isChaotic).length).toBe(3)
    expect(all.filter((a) => !a.isBoss).length).toBe(19) // 16 + 3 mutants
  })
})
