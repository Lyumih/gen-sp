import { describe, expect, it } from 'vitest'
import type { BattlePlayerCard, BattleState } from '../types'
import { tickHeroCardCooldowns } from './cardCooldown'

function card(partial: Partial<BattlePlayerCard> & Pick<BattlePlayerCard, 'id'>): BattlePlayerCard {
  return {
    templateId: 'strike',
    global_level: 1,
    uses_count: 0,
    modifications: [],
    cooldownRemaining: 0,
    ...partial,
  }
}

function baseState(playerCards: BattlePlayerCard[]): BattleState {
  return {
    width: 4,
    height: 4,
    walls: [],
    units: [],
    turnOrder: ['hero'],
    currentTurnIndex: 0,
    phase: 'ongoing',
    worldPower: 0,
    playerCards,
    modKillTargetCardId: null,
    battleLog: [],
    gearCardLevelBonus: 0,
  }
}

describe('tickHeroCardCooldowns', () => {
  it('decrements all positive cooldowns', () => {
    const state = baseState([card({ id: 'c1', cooldownRemaining: 3 })])
    const next = tickHeroCardCooldowns(state)
    expect(next.playerCards[0]!.cooldownRemaining).toBe(2)
  })

  it('skips tick when skipHeroCooldownTick is set', () => {
    const state = { ...baseState([card({ id: 'c1', cooldownRemaining: 3 })]), skipHeroCooldownTick: true }
    const next = tickHeroCardCooldowns(state)
    expect(next.playerCards[0]!.cooldownRemaining).toBe(3)
    expect(next.skipHeroCooldownTick).toBeUndefined()
  })
})
