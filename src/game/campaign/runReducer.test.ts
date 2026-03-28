import { describe, expect, it } from 'vitest'
import type { BattleState, CampaignState, Unit } from '../types'
import {
  applyRunAction,
  cloneCards,
  cloneItems,
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
    gearCardLevelBonus: 0,
  }
  return { ...base, ...overrides, units: overrides.units ?? base.units }
}

function campaignWithBattle(b: BattleState): CampaignState {
  const init = initialCampaignState()
  return {
    ...init,
    phase: 'battle',
    battle: b,
    battleAttemptSnapshot: {
      worldPower: b.worldPower,
      cards: cloneCards(b.playerCards),
      playerUnitLevel: 1,
      modKillTargetCardId: 'c1',
      scenarioSlotIndex: 0,
      gold: init.gold,
      items: cloneItems(init.items),
      equipment: { ...init.equipment },
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

    s = applyRunAction(s, { type: 'FINALIZE_VICTORY', itemLevelRolls: [] })
    expect(s.phase).toBe('hub')
    expect(s.scenarioIndex).toBe(1)
    expect(s.battle).toBeNull()
    expect(s.battleAttemptSnapshot).toBeNull()
    expect(s.worldPower).toBe(1)
    expect(s.gold).toBe(55)
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

    s = applyRunAction(s, { type: 'FINALIZE_VICTORY', itemLevelRolls: [] })
    expect(s.phase).toBe('hub')
    expect(s.scenarioIndex).toBe(SCENARIOS.length)
    expect(s.battle).toBeNull()
    expect(s.battleAttemptSnapshot).toBeNull()
    expect(s.worldPower).toBe(1)
    expect(s.gold).toBe(55)
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

  it('applies gearCardLevelBonus to card damage', () => {
    const b = makeBattle({ gearCardLevelBonus: 5 })
    let s = campaignWithBattle(b)
    s = applyRunAction(s, {
      type: 'USE_CARD_ATTACK',
      cardId: 'c1',
      targetId: 'e1',
      randomInt1to100: 48,
    })
    expect(s.battle!.units.find((u) => u.id === 'e1')!.hp).toBe(438)
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

describe('shop and FINALIZE_VICTORY rolls', () => {
  it('FINALIZE_VICTORY no-op when itemLevelRolls length mismatches equipped count', () => {
    const init = initialCampaignState()
    const items = [{ id: 'w1', templateId: 'wooden_sword', itemLevel: 1 }]
    const equipment = { ...init.equipment, weapon: 'w1' as const }
    const snap = {
      worldPower: 0,
      cards: cloneCards(init.cards),
      playerUnitLevel: 1,
      modKillTargetCardId: 'c1' as const,
      scenarioSlotIndex: 0,
      gold: 100,
      items: cloneItems(items),
      equipment: { ...equipment },
    }
    const b = makeBattle({ phase: 'victory' })
    const s: CampaignState = {
      ...init,
      gold: 100,
      items,
      equipment,
      phase: 'victory',
      battle: b,
      battleAttemptSnapshot: snap,
    }
    const next = applyRunAction(s, { type: 'FINALIZE_VICTORY', itemLevelRolls: [] })
    expect(next.phase).toBe('victory')
    expect(next.gold).toBe(100)
    expect(next.scenarioIndex).toBe(init.scenarioIndex)
    expect(next.items[0]!.itemLevel).toBe(1)
  })

  it('FINALIZE_VICTORY applies memento roll and gold when length matches', () => {
    const init = initialCampaignState()
    const items = [{ id: 'w1', templateId: 'wooden_sword', itemLevel: 1 }]
    const equipment = { ...init.equipment, weapon: 'w1' as const }
    const snap = {
      worldPower: 0,
      cards: cloneCards(init.cards),
      playerUnitLevel: 1,
      modKillTargetCardId: 'c1' as const,
      scenarioSlotIndex: 0,
      gold: 10,
      items: cloneItems(items),
      equipment: { ...equipment },
    }
    const b = makeBattle({ phase: 'victory' })
    let s: CampaignState = {
      ...init,
      gold: 10,
      items,
      equipment,
      phase: 'victory',
      battle: b,
      battleAttemptSnapshot: snap,
    }
    s = applyRunAction(s, { type: 'FINALIZE_VICTORY', itemLevelRolls: [100] })
    expect(s.phase).toBe('hub')
    expect(s.items.find((i) => i.id === 'w1')!.itemLevel).toBe(2)
    expect(s.gold).toBe(10 + 55)
  })

  it('BUY_ITEM then defeat then RETRY restores gold and items from snapshot', () => {
    let s = { ...initialCampaignState(), gold: 100 }
    s = applyRunAction(s, { type: 'BUY_ITEM', templateId: 'wooden_sword' })
    expect(s.gold).toBe(90)
    expect(s.items).toHaveLength(1)

    s = applyRunAction(s, { type: 'START_OR_CONTINUE_BATTLE' })
    const goldAtStart = s.gold

    s = applyRunAction(s, {
      type: 'BATTLE_DISPATCH',
      battleAction: { type: 'move', unitId: 'hero', toX: 1, toY: 2 },
    })
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
    expect(s.phase).toBe('battle')
    expect(s.gold).toBe(goldAtStart)
    expect(s.items).toHaveLength(1)
  })
})

describe('scenarios', () => {
  it('has 2–3 battles', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(2)
    expect(SCENARIOS.length).toBeLessThanOrEqual(3)
  })
})
