import { describe, expect, it } from 'vitest'
import { LEGACY_HERO_CHARACTER_ID } from '../../game/character/constants'
import type { BattlePlayerCard, BattleState, Unit } from '../../game/types'
import { pickHeroAiAction } from './heroAi'

const HERO_ID = LEGACY_HERO_CHARACTER_ID

function unit(partial: Unit): Unit {
  return partial
}

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

function battle(
  overrides: Partial<BattleState> & { playerCards?: BattlePlayerCard[] } = {},
): BattleState {
  const { playerCards, ...rest } = overrides
  const base: BattleState = {
    width: 6,
    height: 4,
    walls: [],
    units: [
      unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
      unit({ id: 'e1', side: 'enemy', x: 1, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
    ],
    turnOrder: [HERO_ID, 'e1'],
    currentTurnIndex: 0,
    roundNumber: 1,
    phase: 'ongoing',
    worldPower: 0,
    playerCardsByUnitId: playerCards ? { [HERO_ID]: playerCards } : {},
    modKillTargetCardId: null,
    battleLog: [],
    gearCardLevelBonus: 0,
  }
  return { ...base, ...rest, units: rest.units ?? base.units }
}

describe('pickHeroAiAction', () => {
  it('returns null when not hero turn', () => {
    const s = battle({ currentTurnIndex: 1 })
    expect(pickHeroAiAction(s)).toBeNull()
  })

  it('moves toward closest enemy when no attack available', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 5, y: 3, hp: 10, maxHp: 10, unitLevel: 1 }),
      ],
    })
    const d = pickHeroAiAction(s)
    expect(d).toEqual({
      kind: 'battle',
      action: { type: 'move', unitId: HERO_ID, toX: 3, toY: 0 },
    })
  })

  it('prefers kill shot target over closer non-lethal enemy', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 1, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e2', side: 'enemy', x: 3, y: 0, hp: 4, maxHp: 4, unitLevel: 1 }),
      ],
    })
    const d = pickHeroAiAction(s)
    expect(d).toEqual({
      kind: 'battle',
      action: {
        type: 'attack',
        attackerId: HERO_ID,
        targetId: 'e2',
        damage: 4,
        kind: 'ranged',
        maxRange: 6,
      },
    })
  })

  it('uses card when in range and stronger than basic attack', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 1, y: 0, hp: 20, maxHp: 20, unitLevel: 1 }),
      ],
      playerCards: [card({ id: 'c1', global_level: 100 })],
    })
    const d = pickHeroAiAction(s)
    expect(d).toEqual({ kind: 'card', cardId: 'c1', targetId: 'e1' })
  })

  it('prefers modKillTargetCardId on equal card damage', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 1, y: 0, hp: 20, maxHp: 20, unitLevel: 1 }),
      ],
      playerCards: [
        card({ id: 'c1', global_level: 50 }),
        card({ id: 'c2', global_level: 50 }),
      ],
      modKillTargetCardId: 'c2',
    })
    const d = pickHeroAiAction(s)
    expect(d).toEqual({ kind: 'card', cardId: 'c2', targetId: 'e1' })
  })

  it('does not pick fireball when no enemy in aoe', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 5, y: 3, hp: 10, maxHp: 10, unitLevel: 1 }),
      ],
      playerCards: [card({ id: 'c2', templateId: 'fireball' })],
    })
    const d = pickHeroAiAction(s)
    expect(d?.kind === 'card_aoe' && d.cardId === 'c2').toBe(false)
  })

  it('picks fireball when enemies cluster in aoe', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 2, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e2', side: 'enemy', x: 2, y: 1, hp: 10, maxHp: 10, unitLevel: 1 }),
      ],
      playerCards: [card({ id: 'c2', templateId: 'fireball', global_level: 50 })],
    })
    const d = pickHeroAiAction(s)
    expect(d).toEqual({
      kind: 'card_aoe',
      cardId: 'c2',
      targetX: 2,
      targetY: 0,
    })
  })

  it('heals self when below 50% hp and no attack available', () => {
    const s = battle({
      width: 10,
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 4, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 9, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
      ],
      playerCards: [card({ id: 'c3', templateId: 'heal' })],
    })
    const d = pickHeroAiAction(s)
    expect(d).toEqual({ kind: 'card_heal', cardId: 'c3', targetId: HERO_ID })
  })
})
