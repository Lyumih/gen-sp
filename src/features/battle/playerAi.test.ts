import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../../game/campaign/runReducer'
import { LEGACY_HERO_CHARACTER_ID } from '../../game/character/constants'
import { testCreateCharacter } from '../../game/stats/testFixtures'
import type { BattlePlayerCard, BattleState, CampaignState, Unit } from '../../game/types'
import { pickPlayerAiAction } from './playerAi'

const HERO_ID = LEGACY_HERO_CHARACTER_ID
const ALLY_ID = 'char-2'

function testCampaign(): CampaignState {
  const base = initialCampaignState()
  const ally = testCreateCharacter({ id: ALLY_ID, name: 'Союзник', classId: 'warrior' })
  return {
    ...base,
    characters: [...base.characters, ally],
    squad: [HERO_ID, ALLY_ID],
  }
}

function unit(partial: Unit): Unit {
  return partial
}

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

function battle(
  overrides: Partial<BattleState> & {
    playerCards?: BattlePlayerCard[]
    playerCardsByUnit?: Record<string, BattlePlayerCard[]>
  } = {},
): BattleState {
  const { playerCards, playerCardsByUnit, ...rest } = overrides
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
    playerCardsByUnitId: playerCardsByUnit ?? (playerCards ? { [HERO_ID]: playerCards } : {}),
    battleLog: [],
  }
  return { ...base, ...rest, units: rest.units ?? base.units }
}

describe('pickPlayerAiAction', () => {
  it('returns null when not a player unit turn', () => {
    const s = battle({ currentTurnIndex: 1 })
    expect(pickPlayerAiAction(s, testCampaign())).toBeNull()
  })

  it('moves toward closest enemy when no attack available', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 5, y: 3, hp: 10, maxHp: 10, unitLevel: 1 }),
      ],
    })
    const d = pickPlayerAiAction(s, testCampaign())
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
    const d = pickPlayerAiAction(s, testCampaign())
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
    const d = pickPlayerAiAction(s, testCampaign())
    expect(d).toEqual({ kind: 'card', cardId: 'c1', targetId: 'e1' })
  })

  it('does not pick fireball when no enemy in aoe', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 5, y: 3, hp: 10, maxHp: 10, unitLevel: 1 }),
      ],
      playerCards: [card({ id: 'c2', templateId: 'fireball' })],
    })
    const d = pickPlayerAiAction(s, testCampaign())
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
    const d = pickPlayerAiAction(s, testCampaign())
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
    const d = pickPlayerAiAction(s, testCampaign())
    expect(d).toEqual({ kind: 'card_heal', cardId: 'c3', targetId: HERO_ID })
  })

  it('acts for any allied unit using that unit cards', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: ALLY_ID, side: 'player', x: 0, y: 1, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 1, y: 1, hp: 20, maxHp: 20, unitLevel: 1 }),
      ],
      turnOrder: [HERO_ID, ALLY_ID, 'e1'],
      currentTurnIndex: 1,
      playerCardsByUnit: {
        [HERO_ID]: [card({ id: 'c-hero', global_level: 1 })],
        [ALLY_ID]: [card({ id: 'c-ally', global_level: 100 })],
      },
    })
    const d = pickPlayerAiAction(s, testCampaign())
    expect(d).toEqual({ kind: 'card', cardId: 'c-ally', targetId: 'e1' })
  })
})
