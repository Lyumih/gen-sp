import { describe, expect, it, vi } from 'vitest'
import { LEGACY_HERO_CHARACTER_ID } from '../../game/character/constants'
import { enemyCardsFromArchetype } from '../../game/battle/enemyCards'
import * as enemyArchetypes from '../../game/content/enemyArchetypes'
import { getEnemyArchetype, type EnemyArchetype } from '../../game/content/enemyArchetypes'
import type { BattlePlayerCard, BattleState, Unit } from '../../game/types'
import { pickEnemyAiAction } from './enemyAi'

const HERO_ID = LEGACY_HERO_CHARACTER_ID

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
    enemyCards?: BattlePlayerCard[]
    enemyCardsByUnit?: Record<string, BattlePlayerCard[]>
  } = {},
): BattleState {
  const { enemyCards, enemyCardsByUnit, ...rest } = overrides
  const base: BattleState = {
    width: 6,
    height: 4,
    walls: [],
    units: [
      unit({ id: HERO_ID, side: 'player', x: 2, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
      unit({
        id: 'e1',
        side: 'enemy',
        x: 0,
        y: 0,
        hp: 10,
        maxHp: 10,
        unitLevel: 1,
        archetypeId: 'test_fire_caster',
        baseStats: {
          health: 10,
          defense: 1,
          attack: 2,
          magicPower: 5,
          mana: 0,
          manaRegen: 0,
          healPower: 0,
          speed: 2,
          initiative: 6,
          critChance: 2,
        },
      }),
    ],
    turnOrder: ['e1', HERO_ID],
    currentTurnIndex: 0,
    roundNumber: 1,
    phase: 'ongoing',
    worldPower: 0,
    playerCardsByUnitId: {},
    enemyCardsByUnitId:
      enemyCardsByUnit ??
      (enemyCards ? { e1: enemyCards } : {}),
    battleLog: [],
  }
  return { ...base, ...rest, units: rest.units ?? base.units }
}

const fireCasterArchetype: EnemyArchetype = {
  ...getEnemyArchetype('grunt')!,
  id: 'test_fire_caster',
  skillPresets: [{ templateId: 'fireball', global_level: 5, modSlots: [] }],
  skillPriorities: [{ skillId: 'fireball', baseScore: 10 }],
}

describe('pickEnemyAiAction', () => {
  it('returns null when not an enemy turn', () => {
    const s = battle({ currentTurnIndex: 1 })
    expect(pickEnemyAiAction(s)).toBeNull()
  })

  it('prefers off-CD fireball in range over basic strike', () => {
    const original = enemyArchetypes.getEnemyArchetype
    vi.spyOn(enemyArchetypes, 'getEnemyArchetype').mockImplementation((id: string) =>
      id === 'test_fire_caster' ? fireCasterArchetype : original(id),
    )

    const s = battle({
      enemyCards: [card({ id: 'fb', templateId: 'fireball', global_level: 5 })],
    })
    const act = pickEnemyAiAction(s)
    expect(act).toMatchObject({
      type: 'card_attack',
      attackerId: 'e1',
      cardId: 'fb',
      targetY: 0,
    })
    expect(act?.type === 'card_attack' && act.targetX !== undefined).toBe(true)
  })

  it('boss_blink_hunter turn 1 scores boss_blink_adjacent highest', () => {
    const bossArchetype = getEnemyArchetype('boss_blink_hunter')!
    const bossCards = enemyCardsFromArchetype(bossArchetype, 'boss')
    const s = battle({
      units: [
        unit({ id: 'h-warrior', side: 'player', x: 1, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({
          id: 'h-ranger',
          side: 'player',
          x: 4,
          y: 0,
          hp: 10,
          maxHp: 10,
          unitLevel: 1,
        }),
        unit({
          id: 'boss',
          side: 'enemy',
          x: 0,
          y: 0,
          hp: 22,
          maxHp: 22,
          unitLevel: 1,
          archetypeId: 'boss_blink_hunter',
          baseStats: bossArchetype.baseStats,
        }),
      ],
      turnOrder: ['boss', 'h-warrior', 'h-ranger'],
      currentTurnIndex: 0,
      playerCardsByUnitId: {
        'h-warrior': [card({ id: 'c-strike', templateId: 'strike' })],
        'h-ranger': [card({ id: 'c-shot', templateId: 'power_shot' })],
      },
      enemyCardsByUnit: { boss: bossCards },
    })
    const act = pickEnemyAiAction(s)
    const blinkCard = bossCards.find((c) => c.templateId === 'boss_blink_adjacent')
    expect(act).toEqual({
      type: 'card_attack',
      attackerId: 'boss',
      cardId: blinkCard!.id,
      targetId: 'h-ranger',
    })
  })
})
