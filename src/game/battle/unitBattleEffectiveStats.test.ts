import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../campaign/runReducer'
import type { BattleState, PassiveInstance, Unit } from '../types'
import { unitBattleEffectiveStats } from './unitBattleEffectiveStats'
import { unitCombatMiniStats } from './unitCombatStats'

const BASE = {
  health: 10,
  defense: 2,
  attack: 3,
  magicPower: 0,
  mana: 0,
  manaRegen: 0,
  healPower: 0,
  speed: 0,
  initiative: 5,
  critChance: 0,
}

function enemyUnit(id: string): Unit {
  return {
    id,
    side: 'enemy',
    x: 1,
    y: 1,
    hp: 10,
    maxHp: 12,
    unitLevel: 1,
    baseStats: { ...BASE },
    initiativeBase: 7,
  }
}

describe('unitBattleEffectiveStats', () => {
  it('applies battle passives for enemy without Character', () => {
    const campaign = initialCampaignState()
    const unit = enemyUnit('e1')
    const fortitude: PassiveInstance = {
      id: 'p1',
      templateId: 'warrior_fortitude',
      global_level: 1,
      uses_count: 0,
      modSlots: [],
    }
    const battle: BattleState = {
      width: 5,
      height: 5,
      walls: [],
      units: [unit],
      turnOrder: ['e1'],
      currentTurnIndex: 0,
      roundNumber: 1,
      phase: 'ongoing',
      worldPower: 0,
      playerCardsByUnitId: {},
      passivesByUnitId: { e1: [fortitude] },
      battleLog: [],
    }
    const without = unitBattleEffectiveStats(
      { ...battle, passivesByUnitId: undefined },
      unit,
      campaign,
    )
    const withPassive = unitBattleEffectiveStats(battle, unit, campaign)
    expect(withPassive).not.toBeNull()
    expect(withPassive!.effective.health).toBe(12)
    expect(withPassive!.effective.initiative).toBe(7)
    expect(withPassive!.effective.defense).toBeGreaterThan(without!.effective.defense)
  })

  it('unitCombatMiniStats uses battle passives for enemy', () => {
    const campaign = initialCampaignState()
    const unit = enemyUnit('e2')
    const fortitude: PassiveInstance = {
      id: 'p2',
      templateId: 'warrior_fortitude',
      global_level: 1,
      uses_count: 0,
      modSlots: [],
    }
    const battle: BattleState = {
      width: 5,
      height: 5,
      walls: [],
      units: [unit],
      turnOrder: ['e2'],
      currentTurnIndex: 0,
      roundNumber: 1,
      phase: 'ongoing',
      worldPower: 0,
      playerCardsByUnitId: {},
      passivesByUnitId: { e2: [fortitude] },
      battleLog: [],
    }
    campaign.battle = battle
    const stats = unitCombatMiniStats(unit, campaign, 0)
    expect(stats).not.toBeNull()
    expect(stats!.defense).toBeGreaterThan(2)
  })
})
