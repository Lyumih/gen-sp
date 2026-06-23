import { describe, expect, it } from 'vitest'
import { LEGACY_HERO_CHARACTER_ID } from '../character/constants'
import { createCharacter } from '../character/createCharacter'
import type { BattlePlayerCard, BattleState, Character, PartyMemberBattleSnapshot } from '../types'
import { TEST_BASE_STATS } from '../stats/testFixtures'
import {
  mergeBattleCardsToParty,
  playerCardsByUnitFromParty,
} from './playerCards'

const HERO_ID = LEGACY_HERO_CHARACTER_ID

function member(
  partial: Partial<PartyMemberBattleSnapshot> & Pick<PartyMemberBattleSnapshot, 'characterId'>,
): PartyMemberBattleSnapshot {
  return {
    unitLevel: 1,
    baseStats: TEST_BASE_STATS,
    items: [],
    equipment: { weapon: null, armor: null, accessory: null },
    cards: [
      {
        id: 'c1',
        templateId: 'strike',
        global_level: 1,
        uses_count: 0,
        modSlots: [],
      },
    ],
    battleLoadout: ['c1', null, null],
    metaStatus: 'active',
    spawnIndex: 0,
    ...partial,
  }
}

describe('playerCardsByUnitFromParty', () => {
  it('maps each active member loadout by characterId', () => {
    const allyId = 'char-ally-1'
    const byUnit = playerCardsByUnitFromParty([
      member({ characterId: HERO_ID, battleLoadout: ['c1', null, null] }),
      member({
        characterId: allyId,
        cards: [
          {
            id: 'a1',
            templateId: 'fireball',
            global_level: 2,
            uses_count: 0,
            modSlots: [],
          },
        ],
        battleLoadout: ['a1', null, null],
        spawnIndex: 1,
      }),
      member({ characterId: 'char-down', metaStatus: 'downed', battleLoadout: ['c1', null, null] }),
    ])

    expect(Object.keys(byUnit).sort()).toEqual([HERO_ID, allyId].sort())
    expect(byUnit[HERO_ID]!.map((c) => c.id)).toEqual(['c1'])
    expect(byUnit[HERO_ID]![0]!.cooldownRemaining).toBe(0)
    expect(byUnit[allyId]!.map((c) => c.id)).toEqual(['a1'])
    expect(byUnit[allyId]![0]!.templateId).toBe('fireball')
  })
})

describe('mergeBattleCardsToParty', () => {
  it('merges battle card progress per characterId', () => {
    const hero = createCharacter({
      id: HERO_ID,
      name: 'Hero',
      classId: 'warrior',
      baseStats: TEST_BASE_STATS,
      baseStatRating: 0.5,
    })
    hero.cards = [
      {
        id: 'c1',
        templateId: 'strike',
        global_level: 1,
        uses_count: 0,
        modSlots: [],
      },
    ]
    hero.battleLoadout = ['c1', null, null]
    const ally: Character = {
      ...hero,
      id: 'char-ally-1',
      name: 'Ally',
      cards: [
        {
          id: 'a1',
          templateId: 'fireball',
          global_level: 1,
          uses_count: 0,
          modSlots: [],
        },
      ],
      battleLoadout: ['a1', null, null],
    }
    const battleCards: BattlePlayerCard[] = [
      {
        id: 'c1',
        templateId: 'strike',
        global_level: 3,
        uses_count: 2,
        modSlots: [],
        cooldownRemaining: 1,
      },
    ]
    const battle: BattleState = {
      width: 4,
      height: 4,
      walls: [],
      units: [],
      turnOrder: [],
      currentTurnIndex: 0,
      roundNumber: 1,
      phase: 'victory',
      worldPower: 0,
      playerCardsByUnitId: {
        [HERO_ID]: battleCards,
        [ally.id]: [
          {
            id: 'a1',
            templateId: 'fireball',
            global_level: 5,
            uses_count: 1,
            modSlots: [],
            cooldownRemaining: 0,
          },
        ],
      },
      battleLog: [],
      gearDamageMult: 1,
      gearStrikeDamageMult: 1,
    }

    const merged = mergeBattleCardsToParty([hero, ally], battle)
    expect(merged[0]!.cards[0]).toMatchObject({ global_level: 3, uses_count: 2 })
    expect(merged[1]!.cards[0]).toMatchObject({ global_level: 5, uses_count: 1 })
    expect(merged[0]!.cards[0]).not.toHaveProperty('cooldownRemaining')
  })
})
