import { describe, expect, it } from 'vitest'
import type { BattleState, CampaignState, Unit } from '../types'
import {
  applyRunAction,
  cloneCards,
  initialCampaignState,
} from './runReducer'
import { SCENARIOS } from './scenarios'

function unit(p: Unit): Unit {
  return p
}

function makeBattle(overrides: Partial<BattleState> = {}): BattleState {
  const base: BattleState = {
    width: 5,
    height: 5,
    walls: [],
    units: [
      unit({
        id: 'hero',
        side: 'player',
        x: 3,
        y: 2,
        hp: 200,
        maxHp: 200,
        unitLevel: 1,
      }),
      unit({
        id: 'e1',
        side: 'enemy',
        x: 4,
        y: 2,
        hp: 500,
        maxHp: 500,
        unitLevel: 1,
      }),
    ],
    turnOrder: ['hero', 'e1'],
    currentTurnIndex: 0,
    phase: 'ongoing',
    worldPower: 0,
    playerCards: [
      {
        id: 'c1',
        templateId: 'strike',
        global_level: 50,
        uses_count: 0,
        modifications: [],
      },
    ],
    modKillTargetCardId: 'c1',
    battleLog: [],
  }
  return { ...base, ...overrides, units: overrides.units ?? base.units }
}

function campaignWithBattle(b: BattleState): CampaignState {
  return {
    ...initialCampaignState(),
    phase: 'battle',
    battle: b,
    battleAttemptSnapshot: {
      worldPower: b.worldPower,
      cards: cloneCards(b.playerCards),
      playerUnitLevel: 1,
      modKillTargetCardId: 'c1',
      scenarioSlotIndex: 0,
    },
  }
}

describe('runReducer', () => {
  it('after victory advances scenario and keeps meta from battle', () => {
    let s = initialCampaignState()
    s = applyRunAction(s, { type: 'START_OR_CONTINUE_BATTLE' })
    expect(s.battle).not.toBeNull()
    expect(s.scenarioIndex).toBe(0)

    s = applyRunAction(s, {
      type: 'BATTLE_DISPATCH',
      battleAction: {
        type: 'attack',
        attackerId: 'hero',
        targetId: 'e1',
        damage: 999,
        kind: 'ranged',
        maxRange: 10,
      },
    })

    expect(s.phase).toBe('victory')
    expect(s.battle?.phase).toBe('victory')
    expect(s.scenarioIndex).toBe(0)

    s = applyRunAction(s, { type: 'FINALIZE_VICTORY' })
    expect(s.phase).toBe('hub')
    expect(s.scenarioIndex).toBe(1)
    expect(s.battle).toBeNull()
    expect(s.battleAttemptSnapshot).toBeNull()
    expect(s.worldPower).toBe(1)
  })

  it('defeat then retry resets battle meta from snapshot (no dup rewards)', () => {
    let s = initialCampaignState()
    s = { ...s, scenarioIndex: 1 }

    s = applyRunAction(s, { type: 'START_OR_CONTINUE_BATTLE' })
    expect(s.battle!.units.some((u) => u.id === 'e1')).toBe(true)
    expect(s.battle!.units.some((u) => u.id === 'e2')).toBe(true)

    s = applyRunAction(s, {
      type: 'BATTLE_DISPATCH',
      battleAction: {
        type: 'attack',
        attackerId: 'hero',
        targetId: 'e1',
        damage: 999,
        kind: 'ranged',
        maxRange: 10,
      },
    })
    expect(s.battle!.worldPower).toBeGreaterThanOrEqual(1)

    s = applyRunAction(s, {
      type: 'BATTLE_DISPATCH',
      battleAction: {
        type: 'attack',
        attackerId: 'e2',
        targetId: 'hero',
        damage: 999,
        kind: 'ranged',
        maxRange: 10,
      },
    })

    expect(s.phase).toBe('defeat')
    expect(s.worldPower).toBe(0)
    expect(s.battle!.worldPower).toBeGreaterThanOrEqual(1)

    s = applyRunAction(s, { type: 'RETRY_CURRENT_BATTLE' })
    expect(s.phase).toBe('battle')
    expect(s.battle!.phase).toBe('ongoing')
    expect(s.battle!.worldPower).toBe(0)
    expect(s.worldPower).toBe(0)
  })

  it('RETRY_CURRENT_BATTLE starts fresh battleLog', () => {
    let s = initialCampaignState()
    s = applyRunAction(s, { type: 'START_OR_CONTINUE_BATTLE' })
    s = applyRunAction(s, {
      type: 'BATTLE_DISPATCH',
      battleAction: { type: 'move', unitId: 'hero', toX: 1, toY: 2 },
    })
    expect(s.battle!.battleLog.length).toBeGreaterThan(0)

    s = applyRunAction(s, {
      type: 'BATTLE_DISPATCH',
      battleAction: {
        type: 'attack',
        attackerId: 'e1',
        targetId: 'hero',
        damage: 999,
        kind: 'ranged',
        maxRange: 10,
      },
    })
    expect(s.phase).toBe('defeat')

    s = applyRunAction(s, { type: 'RETRY_CURRENT_BATTLE' })
    expect(s.battle!.battleLog).toEqual([])
  })

  it('ABANDON_BATTLE rolls back meta and returns to hub', () => {
    let s = initialCampaignState()
    s = applyRunAction(s, { type: 'START_OR_CONTINUE_BATTLE' })
    const wpBefore = s.worldPower
    s = applyRunAction(s, {
      type: 'BATTLE_DISPATCH',
      battleAction: { type: 'move', unitId: 'hero', toX: 1, toY: 2 },
    })
    expect(s.battle!.battleLog.length).toBeGreaterThan(0)

    s = applyRunAction(s, { type: 'ABANDON_BATTLE' })
    expect(s.battle).toBeNull()
    expect(s.phase).toBe('hub')
    expect(s.battleAttemptSnapshot).toBeNull()
    expect(s.worldPower).toBe(wpBefore)
  })

  it('linear START_OR_CONTINUE_BATTLE snapshot has scenarioSlotIndex === scenarioIndex', () => {
    let s = initialCampaignState()
    s = applyRunAction(s, { type: 'START_OR_CONTINUE_BATTLE' })
    expect(s.battleAttemptSnapshot?.scenarioSlotIndex).toBe(s.scenarioIndex)
    expect(s.battleAttemptSnapshot?.scenarioSlotIndex).toBe(0)
  })

  it('replay victory does not advance scenarioIndex when campaign already complete', () => {
    let s = { ...initialCampaignState(), scenarioIndex: SCENARIOS.length }
    s = applyRunAction(s, { type: 'START_REPLAY_BATTLE', scenarioSlotIndex: 0 })
    expect(s.battle).not.toBeNull()
    expect(s.battleAttemptSnapshot?.scenarioSlotIndex).toBe(0)

    s = applyRunAction(s, {
      type: 'BATTLE_DISPATCH',
      battleAction: {
        type: 'attack',
        attackerId: 'hero',
        targetId: 'e1',
        damage: 999,
        kind: 'ranged',
        maxRange: 10,
      },
    })

    expect(s.phase).toBe('victory')
    expect(s.scenarioIndex).toBe(SCENARIOS.length)

    s = applyRunAction(s, { type: 'FINALIZE_VICTORY' })
    expect(s.phase).toBe('hub')
    expect(s.scenarioIndex).toBe(SCENARIOS.length)
    expect(s.battle).toBeNull()
    expect(s.battleAttemptSnapshot).toBeNull()
    expect(s.worldPower).toBe(1)
  })

  it('replay defeat then retry uses same scenario slot', () => {
    let s = { ...initialCampaignState(), scenarioIndex: SCENARIOS.length }
    s = applyRunAction(s, { type: 'START_REPLAY_BATTLE', scenarioSlotIndex: 1 })
    expect(s.battle!.units.some((u) => u.id === 'e1')).toBe(true)
    expect(s.battle!.units.some((u) => u.id === 'e2')).toBe(true)

    s = applyRunAction(s, {
      type: 'BATTLE_DISPATCH',
      battleAction: {
        type: 'attack',
        attackerId: 'hero',
        targetId: 'e1',
        damage: 999,
        kind: 'ranged',
        maxRange: 10,
      },
    })

    s = applyRunAction(s, {
      type: 'BATTLE_DISPATCH',
      battleAction: {
        type: 'attack',
        attackerId: 'e2',
        targetId: 'hero',
        damage: 999,
        kind: 'ranged',
        maxRange: 10,
      },
    })

    expect(s.phase).toBe('defeat')

    s = applyRunAction(s, { type: 'RETRY_CURRENT_BATTLE' })
    expect(s.phase).toBe('battle')
    expect(s.battle!.width).toBe(SCENARIOS[1]!.width)
    expect(s.battle!.units.some((u) => u.id === 'e1')).toBe(true)
    expect(s.battle!.units.some((u) => u.id === 'e2')).toBe(true)
  })
})

describe('USE_CARD_ATTACK', () => {
  it('increments uses_count and deals damage when adjacent', () => {
    const b = makeBattle()
    let s = campaignWithBattle(b)
    s = applyRunAction(s, {
      type: 'USE_CARD_ATTACK',
      cardId: 'c1',
      targetId: 'e1',
      randomInt1to100: 48,
    })
    const card = s.battle!.playerCards.find((c) => c.id === 'c1')!
    expect(card.uses_count).toBe(1)
    expect(card.global_level).toBe(50)
    expect(s.battle!.units.find((u) => u.id === 'e1')!.hp).toBe(440)
  })

  it('does not consume use when out of melee range', () => {
    const b = makeBattle({
      units: [
        unit({
          id: 'hero',
          side: 'player',
          x: 0,
          y: 0,
          hp: 20,
          maxHp: 20,
          unitLevel: 1,
        }),
        unit({
          id: 'e1',
          side: 'enemy',
          x: 4,
          y: 2,
          hp: 50,
          maxHp: 50,
          unitLevel: 1,
        }),
      ],
    })
    let s = campaignWithBattle(b)
    s = applyRunAction(s, {
      type: 'USE_CARD_ATTACK',
      cardId: 'c1',
      targetId: 'e1',
      randomInt1to100: 50,
    })
    expect(s.battle!.playerCards.find((c) => c.id === 'c1')!.uses_count).toBe(0)
    expect(s.battle!.units.find((u) => u.id === 'e1')!.hp).toBe(50)
  })

  it('no-op when not hero turn', () => {
    const b = makeBattle({ currentTurnIndex: 1 })
    let s = campaignWithBattle(b)
    const before = s.battle!.playerCards[0]!.uses_count
    s = applyRunAction(s, {
      type: 'USE_CARD_ATTACK',
      cardId: 'c1',
      targetId: 'e1',
      randomInt1to100: 50,
    })
    expect(s.battle!.playerCards[0]!.uses_count).toBe(before)
  })

  it('appends card_level_up to battleLog when level increases', () => {
    const b = makeBattle({
      playerCards: [
        {
          id: 'c1',
          templateId: 'strike',
          global_level: 1,
          uses_count: 0,
          modifications: [],
        },
      ],
    })
    let s = campaignWithBattle(b)
    const roll = 42
    s = applyRunAction(s, {
      type: 'USE_CARD_ATTACK',
      cardId: 'c1',
      targetId: 'e1',
      randomInt1to100: roll,
    })
    expect(s.battle!.playerCards[0]!.global_level).toBe(2)
    const up = s.battle!.battleLog.find((e) => e.type === 'card_level_up')
    expect(up).toMatchObject({
      type: 'card_level_up',
      cardId: 'c1',
      templateId: 'strike',
      fromLevel: 1,
      toLevel: 2,
      roll,
    })
  })
})

describe('scenarios', () => {
  it('has 2–3 battles', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(2)
    expect(SCENARIOS.length).toBeLessThanOrEqual(3)
  })
})
