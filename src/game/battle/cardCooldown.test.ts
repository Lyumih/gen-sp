import { describe, expect, it } from 'vitest'
import { LEGACY_HERO_CHARACTER_ID } from '../character/constants'
import type { BattlePlayerCard, BattleState } from '../types'
import { tickEnemyCardCooldowns, tickHeroCardCooldowns } from './cardCooldown'

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

function baseState(
  unitId: string,
  playerCards: BattlePlayerCard[],
  enemyCards?: BattlePlayerCard[],
): BattleState {
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
    ...(enemyCards !== undefined ? { enemyCardsByUnitId: { [unitId]: enemyCards } } : {}),
    battleLog: [],
    gearDamageMult: 1,
    gearStrikeDamageMult: 1,
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

  it('decrements hero ranged cooldown for the given actor', () => {
    const state = {
      ...baseState(HERO_ID, []),
      heroRangedCooldownByUnitId: { [HERO_ID]: 1 },
    }
    const next = tickHeroCardCooldowns(state, HERO_ID)
    expect(next.heroRangedCooldownByUnitId?.[HERO_ID]).toBeUndefined()
  })
})

describe('tickEnemyCardCooldowns', () => {
  it('skips tick when skipEnemyCooldownTick is set', () => {
    const state = {
      ...baseState(HERO_ID, [], [card({ id: 'fb', cooldownRemaining: 6 })]),
      skipEnemyCooldownTick: true,
    }
    const next = tickEnemyCardCooldowns(state, HERO_ID)
    expect(next.enemyCardsByUnitId?.[HERO_ID]?.[0]?.cooldownRemaining).toBe(6)
    expect(next.skipEnemyCooldownTick).toBeUndefined()
  })
})
