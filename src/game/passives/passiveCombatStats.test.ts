import { describe, expect, it } from 'vitest'
import { LEGACY_HERO_CHARACTER_ID } from '../character/constants'
import { HERO_BASIC_MELEE_DAMAGE } from '../battle/combat'
import { TEST_BASE_STATS } from '../stats/testFixtures'
import type { BattleState, Unit } from '../types'
import { createPassiveInstance } from './passiveFactory'
import { applyPassiveAttackBonus } from './passiveCombatStats'
import { passiveEquipFromBattlePassives } from '../campaign/playerPassivesFromParty'

const HERO_ID = LEGACY_HERO_CHARACTER_ID

function battle(passivesByUnitId?: BattleState['passivesByUnitId']): BattleState {
  const passives = passivesByUnitId?.[HERO_ID] ?? []
  return {
    width: 4,
    height: 4,
    walls: [],
    units: [
      {
        id: HERO_ID,
        side: 'player',
        x: 0,
        y: 0,
        hp: 10,
        maxHp: 10,
        unitLevel: 1,
        baseStats: TEST_BASE_STATS,
      },
    ],
    turnOrder: [HERO_ID],
    currentTurnIndex: 0,
    roundNumber: 1,
    phase: 'ongoing',
    worldPower: 0,
    playerCardsByUnitId: {},
    battleLog: [],
    passivesByUnitId: passives.length > 0 ? passivesByUnitId : undefined,
  }
}

describe('passiveCombatStats', () => {
  it('applyPassiveAttackBonus adds equipped attack flat passive', () => {
    const rage = createPassiveInstance('berserker_rage')
    const state = battle({ [HERO_ID]: [rage] })
    const attacker = state.units[0] as Unit
    const damage = applyPassiveAttackBonus(state, attacker, HERO_BASIC_MELEE_DAMAGE)
    expect(damage).toBeGreaterThan(HERO_BASIC_MELEE_DAMAGE)
    expect(passiveEquipFromBattlePassives([rage])).toEqual([rage.id, null, null, null, null])
  })
})
