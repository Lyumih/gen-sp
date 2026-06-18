import { describe, expect, it } from 'vitest'
import { ENEMY_TEMPLATES } from '../content/enemyTemplates'
import { SCENARIOS } from './scenarios'

describe('SCENARIOS enemy archetypes', () => {
  it('every enemy has archetypeId present in enemy templates', () => {
    for (const scenario of SCENARIOS) {
      for (const enemy of scenario.enemies) {
        expect(enemy.archetypeId, `${scenario.id}/${enemy.id}`).toBeTruthy()
        expect(ENEMY_TEMPLATES[enemy.archetypeId], `${scenario.id}/${enemy.id}`).toBeDefined()
      }
    }
  })
})
