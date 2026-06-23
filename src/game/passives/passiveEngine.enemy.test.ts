import { describe, expect, it } from 'vitest'
import { TEST_BASE_STATS } from '../stats/testFixtures'
import type { BattleState, Unit } from '../types'
import { createPassiveInstance } from './passiveFactory'
import { firePassives } from './passiveEngine'

describe('enemy passives in firePassives', () => {
  it('enemy_thorns reflects melee damage to attacker', () => {
    const thorns = createPassiveInstance('enemy_thorns')
    thorns.global_level = 3
    const enemy: Unit = {
      id: 'e1',
      side: 'enemy',
      x: 1,
      y: 0,
      hp: 20,
      maxHp: 20,
      unitLevel: 1,
      baseStats: TEST_BASE_STATS,
    }
    const battle: BattleState = {
      width: 4,
      height: 4,
      walls: [],
      units: [
        enemy,
        {
          id: 'h1',
          side: 'player',
          x: 0,
          y: 0,
          hp: 10,
          maxHp: 10,
          unitLevel: 1,
          baseStats: TEST_BASE_STATS,
        },
      ],
      turnOrder: ['e1', 'h1'],
      currentTurnIndex: 0,
      roundNumber: 1,
      phase: 'ongoing',
      worldPower: 0,
      playerCardsByUnitId: {},
      battleLog: [],
    }
    const result = firePassives({
      trigger: 'on_damaged',
      passives: [thorns],
      passiveEquip: [thorns.id, null, null, null],
      actor: enemy,
      battle,
      rng: () => 0.5,
      randomInt1to100: () => 100,
      damageDealt: 10,
      attackerId: 'h1',
      attackKind: 'melee',
      phase: 'post_damage',
    })
    expect(result.combatPatches).toHaveLength(1)
    expect(result.combatPatches[0]).toMatchObject({
      kind: 'reflect',
      targetId: 'h1',
      damage: 2,
    })
  })
})
