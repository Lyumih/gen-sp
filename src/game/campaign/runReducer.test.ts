import { describe, expect, it } from 'vitest'
import { codexEntryId } from '../codex/discovery'
import type {
  BattleAttemptSnapshot,
  BattleState,
  CampaignState,
  PartyMemberBattleSnapshot,
  Unit,
} from '../types'
import {
  applyRunAction,
  cloneCards,
  cloneItems,
  initialCampaignState,
} from './runReducer'
import { SCENARIOS } from './scenarios'
import { getPrimaryCharacter } from './selectors'
import { LEGACY_HERO_CHARACTER_ID } from '../character/constants'
import { createCharacter } from '../character/createCharacter'

const HERO_ID = LEGACY_HERO_CHARACTER_ID

function hero(c: CampaignState) {
  return getPrimaryCharacter(c)
}

function withHero(
  c: CampaignState,
  patch: Partial<ReturnType<typeof getPrimaryCharacter>>,
): CampaignState {
  const primary = getPrimaryCharacter(c)
  return {
    ...c,
    characters: c.characters.map((ch) =>
      ch.id === primary.id ? { ...ch, ...patch } : ch,
    ),
  }
}

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
        id: HERO_ID,
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
    turnOrder: [HERO_ID, 'e1'],
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
        cooldownRemaining: 0,
      },
    ],
    modKillTargetCardId: 'c1',
    battleLog: [],
    gearCardLevelBonus: 0,
  }
  return { ...base, ...overrides, units: overrides.units ?? base.units }
}

function partyMemberFromHero(
  h: ReturnType<typeof getPrimaryCharacter>,
  over: Partial<PartyMemberBattleSnapshot> = {},
): PartyMemberBattleSnapshot {
  return {
    characterId: h.id,
    unitLevel: h.unitLevel,
    items: cloneItems(h.items),
    equipment: { ...h.equipment },
    cards: cloneCards(h.cards),
    battleLoadout: [...h.battleLoadout] as [string | null, string | null],
    metaStatus: 'active',
    spawnIndex: 0,
    ...over,
  }
}

function battleSnapshotFromHero(
  c: CampaignState,
  over: Partial<BattleAttemptSnapshot> = {},
): BattleAttemptSnapshot {
  const h = hero(c)
  return {
    worldPower: 0,
    modKillTargetCardId: 'c1',
    scenarioSlotIndex: 0,
    gold: c.gold,
    party: [partyMemberFromHero(h)],
    ...over,
  }
}

function campaignWithBattle(b: BattleState): CampaignState {
  const init = initialCampaignState()
  const h = hero(init)
  return {
    ...init,
    phase: 'battle',
    battle: b,
    battleAttemptSnapshot: battleSnapshotFromHero(init, {
      worldPower: b.worldPower,
      party: [
        partyMemberFromHero(h, {
          cards: cloneCards(b.playerCards),
          battleLoadout: ['c1', 'c2'],
        }),
      ],
    }),
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
        attackerId: HERO_ID,
        targetId: 'e1',
        damage: 999,
        kind: 'ranged',
        maxRange: 10,
      },
    })

    expect(s.phase).toBe('victory')
    expect(s.battle?.phase).toBe('victory')
    expect(s.scenarioIndex).toBe(0)

    s = applyRunAction(s, {
      type: 'FINALIZE_VICTORY',
      itemLevelRolls: [],
      playerUnitLevelRoll: 50,
    })
    expect(s.phase).toBe('hub')
    expect(s.scenarioIndex).toBe(1)
    expect(s.battle).toBeNull()
    expect(s.battleAttemptSnapshot).toBeNull()
    expect(s.worldPower).toBe(1)
    expect(s.gold).toBe(55)
    expect(hero(s).unitLevel).toBe(2)
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
        attackerId: HERO_ID,
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
        targetId: HERO_ID,
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
      battleAction: { type: 'move', unitId: HERO_ID, toX: 1, toY: 2 },
    })
    expect(s.battle!.battleLog.length).toBeGreaterThan(0)

    s = applyRunAction(s, {
      type: 'BATTLE_DISPATCH',
      battleAction: {
        type: 'attack',
        attackerId: 'e1',
        targetId: HERO_ID,
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
      battleAction: { type: 'move', unitId: HERO_ID, toX: 1, toY: 2 },
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
        attackerId: HERO_ID,
        targetId: 'e1',
        damage: 999,
        kind: 'ranged',
        maxRange: 10,
      },
    })

    expect(s.phase).toBe('victory')
    expect(s.scenarioIndex).toBe(SCENARIOS.length)

    s = applyRunAction(s, {
      type: 'FINALIZE_VICTORY',
      itemLevelRolls: [],
      playerUnitLevelRoll: 1,
    })
    expect(s.phase).toBe('hub')
    expect(s.scenarioIndex).toBe(SCENARIOS.length)
    expect(s.battle).toBeNull()
    expect(s.battleAttemptSnapshot).toBeNull()
    expect(s.worldPower).toBe(1)
    expect(s.gold).toBe(55)
    expect(hero(s).unitLevel).toBe(2)
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
        attackerId: HERO_ID,
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
        targetId: HERO_ID,
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
          id: HERO_ID,
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
          cooldownRemaining: 0,
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

  it('discovers used attack card in codex', () => {
    const b = makeBattle()
    let s = campaignWithBattle(b)

    s = applyRunAction(s, {
      type: 'USE_CARD_ATTACK',
      cardId: 'c1',
      targetId: 'e1',
      randomInt1to100: 48,
    })

    expect(s.codexDiscovered).toContain(codexEntryId('card', 'strike'))
  })
})

describe('USE_CARD_AOE', () => {
  it('applies damage in 3x3 and increments uses_count', () => {
    const b = makeBattle({
      units: [
        unit({
          id: HERO_ID,
          side: 'player',
          x: 2,
          y: 2,
          hp: 200,
          maxHp: 200,
          unitLevel: 1,
        }),
        unit({
          id: 'e1',
          side: 'enemy',
          x: 2,
          y: 1,
          hp: 500,
          maxHp: 500,
          unitLevel: 1,
        }),
      ],
      playerCards: [
        {
          id: 'c2',
          templateId: 'fireball',
          global_level: 50,
          uses_count: 0,
          modifications: [],
          cooldownRemaining: 0,
        },
      ],
    })
    let s = campaignWithBattle(b)
    s = applyRunAction(s, {
      type: 'USE_CARD_AOE',
      cardId: 'c2',
      targetX: 2,
      targetY: 2,
      randomInt1to100: 50,
    })
    expect(s.battle!.playerCards.find((c) => c.id === 'c2')!.uses_count).toBe(1)
    expect(s.battle!.units.find((u) => u.id === 'e1')!.hp).toBeLessThan(500)
  })

  it('no-op when target out of cast range', () => {
    const b = makeBattle({
      units: [
        unit({
          id: HERO_ID,
          side: 'player',
          x: 0,
          y: 0,
          hp: 200,
          maxHp: 200,
          unitLevel: 1,
        }),
        unit({
          id: 'e1',
          side: 'enemy',
          x: 4,
          y: 4,
          hp: 500,
          maxHp: 500,
          unitLevel: 1,
        }),
      ],
      playerCards: [
        {
          id: 'c2',
          templateId: 'fireball',
          global_level: 50,
          uses_count: 0,
          modifications: [],
          cooldownRemaining: 0,
        },
      ],
    })
    let s = campaignWithBattle(b)
    const before = s.battle!.playerCards.find((c) => c.id === 'c2')!.uses_count
    s = applyRunAction(s, {
      type: 'USE_CARD_AOE',
      cardId: 'c2',
      targetX: 4,
      targetY: 4,
      randomInt1to100: 50,
    })
    expect(s.battle!.playerCards.find((c) => c.id === 'c2')!.uses_count).toBe(before)
  })
})

describe('shop and FINALIZE_VICTORY rolls', () => {
  it('BUY_ITEM discovers item in codex', () => {
    let s = { ...initialCampaignState(), gold: 100 }

    s = applyRunAction(s, {
      type: 'BUY_ITEM',
      characterId: HERO_ID,
      templateId: 'wooden_sword',
    })

    expect(s.codexDiscovered).toContain(codexEntryId('item', 'wooden_sword'))
  })

  it('FINALIZE_VICTORY no-op when itemLevelRolls length mismatches equipped count', () => {
    const init = initialCampaignState()
    const h = hero(init)
    const items = [{ id: 'w1', templateId: 'wooden_sword', itemLevel: 1 }]
    const equipment = { ...h.equipment, weapon: 'w1' as const }
    const snap = battleSnapshotFromHero(init, {
      gold: 100,
      party: [
        partyMemberFromHero(h, {
          unitLevel: 1,
          items: cloneItems(items),
          equipment: { ...equipment },
        }),
      ],
    })
    const b = makeBattle({ phase: 'victory' })
    const s: CampaignState = withHero(
      { ...init, gold: 100, phase: 'victory', battle: b, battleAttemptSnapshot: snap },
      { items, equipment },
    )
    const next = applyRunAction(s, {
      type: 'FINALIZE_VICTORY',
      itemLevelRolls: [],
      playerUnitLevelRoll: 100,
    })
    expect(next.phase).toBe('victory')
    expect(next.gold).toBe(100)
    expect(next.scenarioIndex).toBe(init.scenarioIndex)
    expect(hero(next).items[0]!.itemLevel).toBe(1)
    expect(hero(next).unitLevel).toBe(1)
  })

  it('FINALIZE_VICTORY applies memento roll and gold when length matches', () => {
    const init = initialCampaignState()
    const h = hero(init)
    const items = [{ id: 'w1', templateId: 'wooden_sword', itemLevel: 1 }]
    const equipment = { ...h.equipment, weapon: 'w1' as const }
    const snap = battleSnapshotFromHero(init, {
      gold: 10,
      party: [
        partyMemberFromHero(h, {
          unitLevel: 1,
          items: cloneItems(items),
          equipment: { ...equipment },
        }),
      ],
    })
    const b = makeBattle({ phase: 'victory' })
    let s: CampaignState = withHero(
      { ...init, gold: 10, phase: 'victory', battle: b, battleAttemptSnapshot: snap },
      { items, equipment },
    )
    s = applyRunAction(s, {
      type: 'FINALIZE_VICTORY',
      itemLevelRolls: [100],
      playerUnitLevelRoll: 100,
    })
    expect(s.phase).toBe('hub')
    expect(hero(s).items.find((i) => i.id === 'w1')!.itemLevel).toBe(2)
    expect(s.gold).toBe(10 + 55)
    expect(hero(s).unitLevel).toBe(2)
  })

  it('FINALIZE_VICTORY hero level memento uses same curve as cards/items', () => {
    const init = initialCampaignState()
    const h = hero(init)
    const b = makeBattle({ phase: 'victory' })
    const s: CampaignState = withHero(
      {
        ...init,
        phase: 'victory',
        battle: b,
        battleAttemptSnapshot: battleSnapshotFromHero(init, {
          party: [partyMemberFromHero(h, { unitLevel: 50 })],
        }),
      },
      { unitLevel: 50 },
    )
    const noUp = applyRunAction(s, {
      type: 'FINALIZE_VICTORY',
      itemLevelRolls: [],
      playerUnitLevelRoll: 49,
    })
    expect(hero(noUp).unitLevel).toBe(50)
    const up = applyRunAction(s, {
      type: 'FINALIZE_VICTORY',
      itemLevelRolls: [],
      playerUnitLevelRoll: 50,
    })
    expect(hero(up).unitLevel).toBe(51)
  })

  it('BUY_ITEM then defeat then RETRY restores gold and items from snapshot', () => {
    let s = { ...initialCampaignState(), gold: 100 }
    s = applyRunAction(s, {
      type: 'BUY_ITEM',
      characterId: HERO_ID,
      templateId: 'wooden_sword',
    })
    expect(s.gold).toBe(90)
    expect(hero(s).items).toHaveLength(1)

    s = applyRunAction(s, { type: 'START_OR_CONTINUE_BATTLE' })
    const goldAtStart = s.gold

    s = applyRunAction(s, {
      type: 'BATTLE_DISPATCH',
      battleAction: { type: 'move', unitId: HERO_ID, toX: 1, toY: 2 },
    })
    s = applyRunAction(s, {
      type: 'BATTLE_DISPATCH',
      battleAction: {
        type: 'attack',
        attackerId: 'e1',
        targetId: HERO_ID,
        damage: 999,
        kind: 'ranged',
        maxRange: 10,
      },
    })
    expect(s.phase).toBe('defeat')

    s = applyRunAction(s, { type: 'RETRY_CURRENT_BATTLE' })
    expect(s.phase).toBe('battle')
    expect(s.gold).toBe(goldAtStart)
    expect(hero(s).items).toHaveLength(1)
  })

  it('BATTLE_DISPATCH discovers killed enemy archetype in codex', () => {
    let s = initialCampaignState()
    s = applyRunAction(s, { type: 'START_OR_CONTINUE_BATTLE' })

    s = applyRunAction(s, {
      type: 'BATTLE_DISPATCH',
      battleAction: {
        type: 'attack',
        attackerId: HERO_ID,
        targetId: 'e1',
        damage: 999,
        kind: 'ranged',
        maxRange: 10,
      },
    })

    expect(s.codexDiscovered).toContain(codexEntryId('enemy', 'grunt'))
  })

  it('MARK_CODEX_SEEN marks discovered entries as seen', () => {
    const s = applyRunAction(
      {
        ...initialCampaignState(),
        codexDiscovered: [
          codexEntryId('item', 'wooden_sword'),
          codexEntryId('enemy', 'grunt'),
        ],
        codexSeenEntryIds: [codexEntryId('item', 'wooden_sword')],
      },
      { type: 'MARK_CODEX_SEEN' },
    )

    expect(s.codexSeenEntryIds).toEqual([
      codexEntryId('item', 'wooden_sword'),
      codexEntryId('enemy', 'grunt'),
    ])
  })
})

describe('inventory grid actions', () => {
  it('SELL_ITEM refunds half price and removes stash item', () => {
    let s = { ...initialCampaignState(), gold: 100 }
    s = applyRunAction(s, {
      type: 'BUY_ITEM',
      characterId: HERO_ID,
      templateId: 'wooden_sword',
    })
    const id = hero(s).items[0]!.id
    s = applyRunAction(s, { type: 'SELL_ITEM', characterId: HERO_ID, itemId: id })
    expect(hero(s).items).toHaveLength(0)
    expect(s.gold).toBe(95)
  })

  it('SELL_ITEM no-op for equipped item', () => {
    let s = { ...initialCampaignState(), gold: 100 }
    s = applyRunAction(s, {
      type: 'BUY_ITEM',
      characterId: HERO_ID,
      templateId: 'wooden_sword',
    })
    const id = hero(s).items[0]!.id
    s = applyRunAction(s, {
      type: 'EQUIP_ITEM',
      characterId: HERO_ID,
      itemId: id,
      slot: 'weapon',
    })
    const before = s
    s = applyRunAction(s, { type: 'SELL_ITEM', characterId: HERO_ID, itemId: id })
    expect(s).toEqual(before)
  })

  it('REORDER_CARDS changes card order when multiple cards', () => {
    let s = initialCampaignState()
    s = applyRunAction(s, {
      type: 'REORDER_CARDS',
      characterId: HERO_ID,
      cardIds: ['c2', 'c1', 'c3'],
    })
    expect(hero(s).cards.map((c) => c.id)).toEqual(['c2', 'c1', 'c3'])
  })

  it('SET_MOD_KILL_TARGET updates target', () => {
    const s = applyRunAction(initialCampaignState(), {
      type: 'SET_MOD_KILL_TARGET',
      cardId: 'c1',
    })
    expect(s.modKillTargetCardId).toBe('c1')
  })

  it('REORDER_STASH persists stash order after equipped block', () => {
    let s = { ...initialCampaignState(), gold: 100 }
    s = applyRunAction(s, {
      type: 'BUY_ITEM',
      characterId: HERO_ID,
      templateId: 'wooden_sword',
    })
    const swordId = hero(s).items[0]!.id
    s = applyRunAction(s, {
      type: 'BUY_ITEM',
      characterId: HERO_ID,
      templateId: 'leather_armor',
    })
    const armorId = hero(s).items.find((i) => i.templateId === 'leather_armor')!.id
    s = applyRunAction(s, {
      type: 'EQUIP_ITEM',
      characterId: HERO_ID,
      itemId: swordId,
      slot: 'weapon',
    })
    s = applyRunAction(s, {
      type: 'REORDER_STASH',
      characterId: HERO_ID,
      itemIds: [armorId],
    })
    expect(hero(s).items.map((i) => i.id)).toEqual([swordId, armorId])
  })

  it('inventory actions no-op in battle', () => {
    let s = applyRunAction({ ...initialCampaignState(), gold: 100 }, {
      type: 'BUY_ITEM',
      characterId: HERO_ID,
      templateId: 'wooden_sword',
    })
    s = applyRunAction(s, { type: 'START_OR_CONTINUE_BATTLE' })
    const before = s
    s = applyRunAction(s, {
      type: 'SELL_ITEM',
      characterId: HERO_ID,
      itemId: hero(before).items[0]!.id,
    })
    expect(s).toEqual(before)
  })
})

describe('squad and transfer actions', () => {
  function twoCharacterCampaign() {
    const base = initialCampaignState()
    const reserve = createCharacter({
      id: 'char-2',
      name: 'Reserve',
      classId: 'mage',
      initiativeBase: 8,
    })
    return {
      ...base,
      characters: [...base.characters, reserve],
      squad: [HERO_ID, null, null, null],
    }
  }

  it('SET_SQUAD_SLOT assigns reserve character and clears duplicate slot', () => {
    let s = twoCharacterCampaign()
    s = applyRunAction(s, {
      type: 'SET_SQUAD_SLOT',
      slotIndex: 1,
      characterId: 'char-2',
    })
    expect(s.squad).toEqual([HERO_ID, 'char-2', null, null])
    s = applyRunAction(s, {
      type: 'SET_SQUAD_SLOT',
      slotIndex: 0,
      characterId: 'char-2',
    })
    expect(s.squad).toEqual(['char-2', null, null, null])
  })

  it('SET_SQUAD_SLOT no-op during expedition', () => {
    const s = {
      ...twoCharacterCampaign(),
      expedition: {
        scenarioChainId: 'test',
        partySize: 1,
        squadSnapshot: [],
        battleIndex: 0,
        battleCount: 1,
        shopLocked: true as const,
      },
    }
    const next = applyRunAction(s, {
      type: 'SET_SQUAD_SLOT',
      slotIndex: 1,
      characterId: 'char-2',
    })
    expect(next).toEqual(s)
  })

  it('SWAP_SQUAD_SLOTS exchanges squad slots', () => {
    let s = twoCharacterCampaign()
    s = applyRunAction(s, {
      type: 'SET_SQUAD_SLOT',
      slotIndex: 1,
      characterId: 'char-2',
    })
    s = applyRunAction(s, { type: 'SWAP_SQUAD_SLOTS', from: 0, to: 1 })
    expect(s.squad).toEqual(['char-2', HERO_ID, null, null])
  })

  it('TRANSFER_ITEM moves stash item between characters', () => {
    let s = applyRunAction({ ...twoCharacterCampaign(), gold: 100 }, {
      type: 'BUY_ITEM',
      characterId: HERO_ID,
      templateId: 'wooden_sword',
    })
    const itemId = hero(s).items[0]!.id
    s = applyRunAction(s, {
      type: 'TRANSFER_ITEM',
      itemId,
      fromCharacterId: HERO_ID,
      toCharacterId: 'char-2',
    })
    expect(hero(s).items).toHaveLength(0)
    expect(s.characters.find((c) => c.id === 'char-2')!.items[0]!.id).toBe(itemId)
  })

  it('TRANSFER_ITEM no-op for equipped item', () => {
    let s = applyRunAction({ ...twoCharacterCampaign(), gold: 100 }, {
      type: 'BUY_ITEM',
      characterId: HERO_ID,
      templateId: 'wooden_sword',
    })
    const itemId = hero(s).items[0]!.id
    s = applyRunAction(s, {
      type: 'EQUIP_ITEM',
      characterId: HERO_ID,
      itemId,
      slot: 'weapon',
    })
    const before = s
    s = applyRunAction(s, {
      type: 'TRANSFER_ITEM',
      itemId,
      fromCharacterId: HERO_ID,
      toCharacterId: 'char-2',
    })
    expect(s).toEqual(before)
  })
})

describe('scenarios', () => {
  it('has 2–3 battles', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(2)
    expect(SCENARIOS.length).toBeLessThanOrEqual(3)
  })
})

describe('expedition state machine', () => {
  function hubState(): CampaignState {
    return initialCampaignState()
  }

  function winCurrentBattle(s: CampaignState): CampaignState {
    let current = s
    let guard = 0
    while (current.battle?.phase === 'ongoing' && guard < 128) {
      guard++
      const b = current.battle!
      const actorId = b.turnOrder[b.currentTurnIndex]
      const before = current
      if (actorId === HERO_ID) {
        const hero = b.units.find((u) => u.id === HERO_ID && u.hp > 0)
        const enemy = b.units.find((u) => u.side === 'enemy' && u.hp > 0)
        if (!hero || !enemy) break
        current = applyRunAction(current, {
          type: 'BATTLE_DISPATCH',
          battleAction: {
            type: 'attack',
            attackerId: HERO_ID,
            targetId: enemy.id,
            damage: 999,
            kind: 'ranged',
            maxRange: 10,
          },
        })
        if (current === before) {
          current = applyRunAction(current, {
            type: 'BATTLE_DISPATCH',
            battleAction: {
              type: 'attack',
              attackerId: HERO_ID,
              targetId: enemy.id,
              damage: 999,
              kind: 'melee',
            },
          })
        }
        if (current === before) {
          const dx = enemy.x > hero.x ? 1 : enemy.x < hero.x ? -1 : 0
          const dy = enemy.y > hero.y ? 1 : enemy.y < hero.y ? -1 : 0
          current = applyRunAction(current, {
            type: 'BATTLE_DISPATCH',
            battleAction: {
              type: 'move',
              unitId: HERO_ID,
              toX: hero.x + dx,
              toY: hero.y + dy,
            },
          })
        }
        if (current === before) {
          current = applyRunAction(current, {
            type: 'BATTLE_DISPATCH',
            battleAction: {
              type: 'move',
              unitId: HERO_ID,
              toX: hero.x,
              toY: hero.y + (enemy.y !== hero.y ? (enemy.y > hero.y ? 1 : -1) : 1),
            },
          })
        }
      } else {
        const actor = b.units.find((u) => u.id === actorId)
        if (!actor) break
        current = applyRunAction(current, {
          type: 'BATTLE_DISPATCH',
          battleAction: {
            type: 'move',
            unitId: actorId,
            toX: Math.max(0, actor.x - 1),
            toY: actor.y,
          },
        })
        if (current === before) {
          current = applyRunAction(current, {
            type: 'BATTLE_DISPATCH',
            battleAction: {
              type: 'move',
              unitId: actorId,
              toX: Math.min(b.width - 1, actor.x + 1),
              toY: actor.y,
            },
          })
        }
      }
      if (current === before) break
    }
    return current
  }

  function loseCurrentBattle(s: CampaignState): CampaignState {
    let current = s
    const b = current.battle!
    if (b.turnOrder[b.currentTurnIndex] === HERO_ID) {
      current = applyRunAction(current, {
        type: 'BATTLE_DISPATCH',
        battleAction: { type: 'move', unitId: HERO_ID, toX: 1, toY: 2 },
      })
    }
    const enemy = current.battle!.units.find((u) => u.side === 'enemy' && u.hp > 0)
    if (!enemy) return current
    return applyRunAction(current, {
      type: 'BATTLE_DISPATCH',
      battleAction: {
        type: 'attack',
        attackerId: enemy.id,
        targetId: HERO_ID,
        damage: 999,
        kind: 'ranged',
        maxRange: 10,
      },
    })
  }

  it('START_EXPEDITION freezes squad and starts first battle', () => {
    const state = hubState()
    const next = applyRunAction(state, {
      type: 'START_EXPEDITION',
      chainId: 'campaign-main',
      selectedCharacterIds: [HERO_ID],
    })

    expect(next.expedition).not.toBeNull()
    expect(next.expedition!.battleIndex).toBe(0)
    expect(next.battle).not.toBeNull()
    expect(next.phase).toBe('battle')
    expect(next.expedition!.scenarioChainId).toBe('campaign-main')

    const frozen = applyRunAction(next, {
      type: 'BUY_ITEM',
      characterId: HERO_ID,
      templateId: 'wooden_sword',
    })
    expect(frozen).toBe(next)
  })

  it('mid-chain victory enters inter_battle and ADVANCE starts next battle', () => {
    let s = applyRunAction(hubState(), {
      type: 'START_EXPEDITION',
      chainId: 'campaign-main',
      selectedCharacterIds: [HERO_ID],
    })

    s = winCurrentBattle(s)
    expect(s.phase).toBe('inter_battle')
    expect(s.battle).toBeNull()
    expect(s.expedition!.battleIndex).toBe(1)

    s = applyRunAction(s, { type: 'ADVANCE_EXPEDITION_BATTLE' })
    expect(s.phase).toBe('battle')
    expect(s.battle).not.toBeNull()
    expect(s.expedition!.battleIndex).toBe(1)
    expect(s.battle!.units.some((u) => u.id === 'e2')).toBe(true)
  })

  it('interBattleReviveAllDowned revives squad on camp between battles', () => {
    let s = applyRunAction(hubState(), {
      type: 'START_EXPEDITION',
      chainId: 'campaign-main',
      selectedCharacterIds: [HERO_ID],
    })

    s = loseCurrentBattle(s)
    expect(s.phase).toBe('defeat')

    s = applyRunAction(s, { type: 'RETRY_CURRENT_BATTLE' })
    s = winCurrentBattle(s)

    expect(s.phase).toBe('inter_battle')
    expect(s.expedition!.squadSnapshot[0]!.metaStatus).toBe('active')
  })

  it('ADVANCE does not spawn battle when squad is downed and camp revive off', () => {
    const s: CampaignState = {
      ...hubState(),
      phase: 'inter_battle',
      expedition: {
        scenarioChainId: 'campaign-main',
        partySize: 1,
        squadSnapshot: [
          {
            characterId: HERO_ID,
            equipment: { weapon: null, armor: null, accessory: null },
            battleLoadout: ['c1', 'c2'],
            metaStatus: 'downed',
          },
        ],
        battleIndex: 1,
        battleCount: 3,
        shopLocked: true,
      },
    }

    const next = applyRunAction(s, { type: 'ADVANCE_EXPEDITION_BATTLE' })
    expect(next.phase).toBe('inter_battle')
    expect(next.battle).toBeNull()
    expect(next.expedition!.squadSnapshot[0]!.metaStatus).toBe('downed')
  })

  it('INTER_BATTLE_REVIVE_ALL revives downed when camp rule enabled', () => {
    let s: CampaignState = {
      ...hubState(),
      phase: 'inter_battle',
      expedition: {
        scenarioChainId: 'campaign-main',
        partySize: 1,
        squadSnapshot: [
          {
            characterId: HERO_ID,
            equipment: { weapon: null, armor: null, accessory: null },
            battleLoadout: ['c1', 'c2'],
            metaStatus: 'downed',
          },
        ],
        battleIndex: 1,
        battleCount: 3,
        shopLocked: true,
        interBattleReviveAllDowned: true,
      },
    }

    s = applyRunAction(s, { type: 'INTER_BATTLE_REVIVE_ALL' })
    expect(s.expedition!.squadSnapshot[0]!.metaStatus).toBe('active')
  })

  it('last battle victory then FINALIZE_VICTORY clears expedition and grants rewards', () => {
    let s = applyRunAction(hubState(), {
      type: 'START_EXPEDITION',
      chainId: 'test-single-battle',
      selectedCharacterIds: [HERO_ID],
    })

    s = winCurrentBattle(s)

    expect(s.phase).toBe('victory')
    expect(s.expedition).not.toBeNull()

    s = applyRunAction(s, {
      type: 'FINALIZE_VICTORY',
      itemLevelRolls: [],
      playerUnitLevelRoll: 50,
    })

    expect(s.phase).toBe('hub')
    expect(s.expedition).toBeNull()
    expect(s.battle).toBeNull()
    expect(s.gold).toBe(55)
    expect(hero(s).unitLevel).toBe(2)
  })

  it('defeat keeps expedition for retry', () => {
    let s = applyRunAction(hubState(), {
      type: 'START_EXPEDITION',
      chainId: 'campaign-main',
      selectedCharacterIds: [HERO_ID],
    })

    s = loseCurrentBattle(s)
    expect(s.phase).toBe('defeat')
    expect(s.expedition).not.toBeNull()
    expect(s.expedition!.battleIndex).toBe(0)

    s = applyRunAction(s, { type: 'RETRY_CURRENT_BATTLE' })
    expect(s.phase).toBe('battle')
    expect(s.expedition!.battleIndex).toBe(0)
  })

  it('FINISH_EXPEDITION clears expedition and returns to hub', () => {
    const s: CampaignState = {
      ...hubState(),
      phase: 'inter_battle',
      expedition: {
        scenarioChainId: 'campaign-main',
        partySize: 1,
        squadSnapshot: [
          {
            characterId: HERO_ID,
            equipment: { weapon: null, armor: null, accessory: null },
            battleLoadout: ['c1', 'c2'],
            metaStatus: 'active',
          },
        ],
        battleIndex: 1,
        battleCount: 3,
        shopLocked: true,
      },
    }

    const next = applyRunAction(s, { type: 'FINISH_EXPEDITION' })
    expect(next.expedition).toBeNull()
    expect(next.phase).toBe('hub')
  })
})
