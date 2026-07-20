import { describe, expect, it } from 'vitest'
import { LEGACY_HERO_CHARACTER_ID } from '../character/constants'
import { createCardInstance } from '../campaign/cardFactory'
import { applyRunAction, initialCampaignState } from '../campaign/runReducer'
import type { BattleState, CampaignState, Unit } from '../types'
import { applyAction } from './reducer'

const HERO_ID = LEGACY_HERO_CHARACTER_ID

function playerFireballState(mana: number): CampaignState {
  const fireball = createCardInstance('fireball', 'player-fireball')
  const base = initialCampaignState()
  const withFireball: CampaignState = {
    ...base,
    characters: base.characters.map((character) =>
      character.id === HERO_ID
        ? {
            ...character,
            cards: [fireball],
            battleLoadout: [fireball.id, null, null, null],
          }
        : character,
    ),
  }
  const started = applyRunAction(withFireball, { type: 'START_OR_CONTINUE_BATTLE' })
  const battle = started.battle!
  const enemy = battle.units.find((unit) => unit.side === 'enemy')!

  return {
    ...started,
    battle: {
      ...battle,
      units: battle.units.map((unit) => {
        if (unit.id === HERO_ID) return { ...unit, x: 0, y: 0, mana, maxMana: 20 }
        if (unit.id === enemy.id) return { ...unit, x: 2, y: 0, hp: 100, maxHp: 100 }
        return unit
      }),
      turnOrder: [HERO_ID, ...battle.turnOrder.filter((id) => id !== HERO_ID)],
      currentTurnIndex: 0,
    },
  }
}

function castPlayerFireball(state: CampaignState): CampaignState {
  const target = state.battle!.units.find((unit) => unit.side === 'enemy')!
  return applyRunAction(state, {
    type: 'USE_CARD_AOE',
    cardId: 'player-fireball',
    targetX: target.x,
    targetY: target.y,
    randomInt1to100: 100,
  })
}

function enemyFireballState(mana: number): BattleState {
  const units: Unit[] = [
    {
      id: HERO_ID,
      side: 'player',
      x: 2,
      y: 0,
      hp: 100,
      maxHp: 100,
      mana: 20,
      maxMana: 20,
      unitLevel: 1,
    },
    {
      id: 'enemy',
      side: 'enemy',
      x: 0,
      y: 0,
      hp: 20,
      maxHp: 20,
      mana,
      maxMana: 20,
      unitLevel: 1,
      baseStats: {
        health: 20,
        defense: 1,
        attack: 2,
        magicPower: 5,
        mana: 20,
        manaRegen: 0,
        healPower: 0,
        speed: 2,
        initiative: 6,
        critChance: 2,
      },
    },
  ]

  return {
    width: 6,
    height: 4,
    walls: [],
    units,
    turnOrder: ['enemy', HERO_ID],
    currentTurnIndex: 0,
    roundNumber: 1,
    phase: 'ongoing',
    worldPower: 0,
    playerCardsByUnitId: {},
    enemyCardsByUnitId: {
      enemy: [
        {
          id: 'enemy-fireball',
          templateId: 'fireball',
          global_level: 1,
          uses_count: 0,
          modSlots: [],
          cooldownRemaining: 0,
        },
      ],
    },
    battleLog: [],
  }
}

describe('combat mana costs', () => {
  it('rejects a player card when the hero cannot afford its mana cost', () => {
    const state = playerFireballState(10)

    expect(castPlayerFireball(state)).toBe(state)
  })

  it('spends player mana after a successful card use', () => {
    const next = castPlayerFireball(playerFireballState(20))

    expect(next.battle!.units.find((unit) => unit.id === HERO_ID)?.mana).toBe(7)
  })

  it('gates and spends mana for enemy card use', () => {
    const action = {
      type: 'card_attack' as const,
      attackerId: 'enemy',
      cardId: 'enemy-fireball',
      targetX: 2,
      targetY: 0,
    }
    const insufficient = enemyFireballState(10)
    expect(applyAction(insufficient, action)).toBe(insufficient)

    const next = applyAction(enemyFireballState(20), action)
    expect(next.units.find((unit) => unit.id === 'enemy')?.mana).toBe(7)
  })
})
