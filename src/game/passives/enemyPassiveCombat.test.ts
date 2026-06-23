import { describe, expect, it } from 'vitest'
import { TEST_BASE_STATS } from '../stats/testFixtures'
import type { BattleState, PassiveInstance, Unit } from '../types'
import {
  antiHealMultiplierFromAdjacentEnemies,
  applyEnemyAffinityDamageMult,
  defenseMitigationFactor,
  mitigateEnemyRangedWard,
} from './enemyPassiveCombat'

function passive(templateId: string, level = 3): PassiveInstance {
  return {
    id: `p-${templateId}`,
    templateId,
    global_level: level,
    uses_count: 0,
    modSlots: [],
  }
}

function unit(
  id: string,
  side: Unit['side'],
  x: number,
  y: number,
): Unit {
  return {
    id,
    side,
    x,
    y,
    hp: 20,
    maxHp: 20,
    unitLevel: 1,
    baseStats: TEST_BASE_STATS,
    raceId: 'orc',
  }
}

function battle(units: Unit[], passivesByUnitId?: BattleState['passivesByUnitId']): BattleState {
  return {
    width: 5,
    height: 5,
    walls: [],
    units,
    turnOrder: units.map((u) => u.id),
    currentTurnIndex: 0,
    roundNumber: 1,
    phase: 'ongoing',
    worldPower: 0,
    playerCardsByUnitId: {},
    battleLog: [],
    passivesByUnitId,
  }
}

describe('enemyPassiveCombat', () => {
  it('antiHealMultiplierFromAdjacentEnemies reduces heal near plague herald', () => {
    const hero = unit('h1', 'player', 1, 0)
    const herald = unit('e1', 'enemy', 0, 0)
    const state = battle([hero, herald], {
      e1: [passive('enemy_anti_heal_aura')],
    })
    expect(antiHealMultiplierFromAdjacentEnemies(state, hero)).toBe(0.75)
  })

  it('mitigateEnemyRangedWard halves ranged damage', () => {
    const boss = unit('b1', 'enemy', 2, 2)
    const state = battle([boss], { b1: [passive('boss_ranged_ward', 5)] })
    const out = mitigateEnemyRangedWard(state, boss, 100, 'ranged', ['ranged'])
    expect(out).toBe(50)
  })

  it('defenseMitigationFactor reduces defense when boss ignores armor', () => {
    const attacker = unit('e1', 'enemy', 0, 0)
    const target = unit('h1', 'player', 1, 0)
    const state = battle([attacker, target], {
      e1: [passive('boss_ignore_armor', 5)],
    })
    expect(defenseMitigationFactor(state, attacker, target)).toBe(0.5)
  })

  it('applyEnemyAffinityDamageMult boosts holy strike from enemy', () => {
    const attacker = unit('e1', 'enemy', 0, 0)
    const state = battle([attacker], { e1: [passive('enemy_holy_ward', 3)] })
    const out = applyEnemyAffinityDamageMult(state, attacker, 100, {
      templateId: 'holy_strike',
    })
    expect(out).toBeGreaterThan(100)
  })
})
