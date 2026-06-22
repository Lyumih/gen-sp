import { describe, expect, it } from 'vitest'
import { LEGACY_HERO_CHARACTER_ID } from '../character/constants'
import type { BattlePlayerCard, BattleState } from '../types'
import { tickHeroCardCooldowns } from './cardCooldown'

const HERO_ID = LEGACY_HERO_CHARACTER_ID

function card(partial: Partial<BattlePlayerCard> & Pick<BattlePlayerCard, 'id'>): BattlePlayerCard {
  return {
    templateId: 'strike',
    global_level: 1,
    uses_count: 0,
    modSlots: [],
    cooldownRemaining: 0,
    ...partial,
  }
}

function baseState(unitId: string, playerCards: BattlePlayerCard[]): BattleState {
  return {
    width: 4,
    height: 4,
    walls: [],
    units: [],
    turnOrder: [unitId],
    currentTurnIndex: 0,
    roundNumber: 1,
    phase: 'ongoing',
    worldPower: 0,
    playerCardsByUnitId: { [unitId]: playerCards },
    battleLog: [],
    gearCardLevelBonus: 0,
  }
}

describe('tickHeroCardCooldowns', () => {
  it('decrements all positive cooldowns for the given actor', () => {
    const state = baseState(HERO_ID, [card({ id: 'c1', cooldownRemaining: 3 })])
    const next = tickHeroCardCooldowns(state, HERO_ID)
    expect(next.playerCardsByUnitId[HERO_ID]![0]!.cooldownRemaining).toBe(2)
  })

  it('skips tick when skipHeroCooldownTick is set', () => {
    const state = { ...baseState(HERO_ID, [card({ id: 'c1', cooldownRemaining: 3 })]), skipHeroCooldownTick: true }
    const next = tickHeroCardCooldowns(state, HERO_ID)
    expect(next.playerCardsByUnitId[HERO_ID]![0]!.cooldownRemaining).toBe(3)
    expect(next.skipHeroCooldownTick).toBeUndefined()
  })
})
