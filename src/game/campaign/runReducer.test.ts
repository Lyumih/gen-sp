import { describe, expect, it } from 'vitest'
import { canMeleeAttack, canRangedAttack } from '../battle/combat'
import { wallSet } from '../battle/grid'
import { reachableMoveCells } from '../battle/rangeOverlay'
import { codexEntryId } from '../codex/discovery'
import type {
  BattleAction,
  BattleAttemptSnapshot,
  BattlePlayerCard,
  BattleState,
  CampaignState,
  PartyMemberBattleSnapshot,
  Unit,
} from '../types'
import { createCardInstance } from './cardFactory'
import {
  applyMementoDeathRollsForDowned,
  applyRunAction,
  cloneCards,
  cloneItems,
  initialCampaignState,
} from './runReducer'
import { getCurrentActorId } from '../battle/reducer'
import { SCENARIOS } from './scenarios'
import { getPrimaryCharacter } from './selectors'
import { LEGACY_HERO_CHARACTER_ID, MAX_ROSTER_SIZE } from '../character/constants'
import { getCharacter } from '../character/selectors'
import { testCreateCharacter } from '../stats/testFixtures'
import { TAVERN_REFRESH_COST } from '../tavern/generateCandidates'
import { generateOffer } from '../memento/modOffers'
import { MOD_OFFER_POOL } from '../content/modTemplates'
import { resolveCarrierTags } from '../mods/carrierTags'
import { milestoneThreshold, rollbackCarrierLevel } from '../memento/modSlots'
import { MOD_SLOT_MILESTONES } from '../config/modSlotMilestones'
import { SKILL_ACQUISITION } from '../config/skillAcquisition'
import type { ModOffer, ModSlotState } from '../types'

function withClassicTestCards(s: CampaignState): CampaignState {
  const strike = createCardInstance('strike', 'c1')
  const fireball = createCardInstance('fireball', 'c2')
  const heal = createCardInstance('heal', 'c3')
  return withHero(s, {
    cards: [strike, fireball, heal],
    battleLoadout: ['c1', 'c2'],
  })
}

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

function heroBattleCards(b: BattleState): readonly BattlePlayerCard[] {
  return b.playerCardsByUnitId[HERO_ID] ?? []
}

function makeBattle(
  overrides: Partial<BattleState> & { playerCards?: BattlePlayerCard[] } = {},
): BattleState {
  const { playerCards, ...rest } = overrides
  const defaultCards: BattlePlayerCard[] = [
    {
      id: 'c1',
      templateId: 'strike',
      global_level: 50,
      uses_count: 0,
      modSlots: [],
      cooldownRemaining: 0,
    },
  ]
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
    roundNumber: 1,
    phase: 'ongoing',
    worldPower: 0,
    playerCardsByUnitId: {
      [HERO_ID]: playerCards ?? defaultCards,
    },
    battleLog: [],
    gearDamageMult: 1,
    gearStrikeDamageMult: 1,
  }
  return { ...base, ...rest, units: rest.units ?? base.units }
}

function partyMemberFromHero(
  h: ReturnType<typeof getPrimaryCharacter>,
  over: Partial<PartyMemberBattleSnapshot> = {},
): PartyMemberBattleSnapshot {
  return {
    characterId: h.id,
    unitLevel: h.unitLevel,
    baseStats: { ...h.baseStats },
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
          cards: cloneCards(heroBattleCards(b)),
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
    const card = heroBattleCards(s.battle!).find((c) => c.id === 'c1')!
    expect(card.uses_count).toBe(1)
    expect(card.global_level).toBe(50)
    expect(s.battle!.units.find((u) => u.id === 'e1')!.hp).toBe(460)
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
    expect(heroBattleCards(s.battle!).find((c) => c.id === 'c1')!.uses_count).toBe(0)
    expect(s.battle!.units.find((u) => u.id === 'e1')!.hp).toBe(50)
  })

  it('no-op when not hero turn', () => {
    const b = makeBattle({ currentTurnIndex: 1 })
    let s = campaignWithBattle(b)
    const before = heroBattleCards(s.battle!)[0]!.uses_count
    s = applyRunAction(s, {
      type: 'USE_CARD_ATTACK',
      cardId: 'c1',
      targetId: 'e1',
      randomInt1to100: 50,
    })
    expect(heroBattleCards(s.battle!)[0]!.uses_count).toBe(before)
  })

  it('applies gearDamageMult to skill card damage', () => {
    const b = makeBattle({
      gearDamageMult: 1.05,
      gearStrikeDamageMult: 1,
      playerCards: [
        {
          id: 'c2',
          templateId: 'fireball',
          global_level: 0,
          uses_count: 0,
          modSlots: [],
          cooldownRemaining: 0,
        },
      ],
    })
    let s = campaignWithBattle(b)
    s = applyRunAction(s, {
      type: 'USE_CARD_AOE',
      cardId: 'c2',
      targetX: 4,
      targetY: 2,
      randomInt1to100: 48,
    })
    expect(s.battle!.units.find((u) => u.id === 'e1')!.hp).toBe(447)
  })

  it('does not level strike card — channel only increments uses_count', () => {
    const b = makeBattle({
      playerCards: [
        {
          id: 'c1',
          templateId: 'strike',
          global_level: 1,
          uses_count: 0,
          modSlots: [],
          cooldownRemaining: 0,
        },
      ],
    })
    let s = campaignWithBattle(b)
    s = applyRunAction(s, {
      type: 'USE_CARD_ATTACK',
      cardId: 'c1',
      targetId: 'e1',
      randomInt1to100: 100,
    })
    expect(heroBattleCards(s.battle!)[0]!.global_level).toBe(1)
    expect(heroBattleCards(s.battle!)[0]!.uses_count).toBe(1)
    expect(s.battle!.battleLog.some((e) => e.type === 'card_level_up')).toBe(false)
  })

  it('appends card_level_up to battleLog when level increases', () => {
    const b = makeBattle({
      playerCards: [
        {
          id: 'c2',
          templateId: 'fireball',
          global_level: 1,
          uses_count: 0,
          modSlots: [],
          cooldownRemaining: 0,
        },
      ],
    })
    let s = campaignWithBattle(b)
    const roll = 42
    s = applyRunAction(s, {
      type: 'USE_CARD_AOE',
      cardId: 'c2',
      targetX: 4,
      targetY: 2,
      randomInt1to100: roll,
    })
    expect(heroBattleCards(s.battle!)[0]!.global_level).toBe(2)
    const up = s.battle!.battleLog.find((e) => e.type === 'card_level_up')
    expect(up).toMatchObject({
      type: 'card_level_up',
      cardId: 'c2',
      templateId: 'fireball',
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

describe('strike weapon channel', () => {
  it('fists baseline damage uses virtual itemLevel 0', () => {
    const b = makeBattle()
    let s = campaignWithBattle(b)
    expect(hero(s).equipment.weapon).toBeNull()
    s = applyRunAction(s, {
      type: 'USE_CARD_ATTACK',
      cardId: 'c1',
      targetId: 'e1',
      randomInt1to100: 50,
    })
    expect(s.battle!.units.find((u) => u.id === 'e1')!.hp).toBe(460)
  })

  it('equipped sword itemLevel drives strike damage and weapon mods', () => {
    const modSlots: ModSlotState[] = [
      { status: 'filled', templateId: 'mod-weapon-damage', lm: 0 },
    ]
    const b = makeBattle()
    let s = withHero(campaignWithBattle(b), {
      items: [{ id: 'w1', templateId: 'wooden_sword', itemLevel: 50, modSlots }],
      equipment: { weapon: 'w1', armor: null, accessory: null },
    })
    s = applyRunAction(s, {
      type: 'USE_CARD_ATTACK',
      cardId: 'c1',
      targetId: 'e1',
      randomInt1to100: 50,
    })
    expect(s.battle!.units.find((u) => u.id === 'e1')!.hp).toBe(416)
    expect(hero(s).items.find((i) => i.id === 'w1')!.itemLevel).toBe(51)
  })

  it('ignores strike card modSlots for damage', () => {
    const b = makeBattle({
      playerCards: [
        {
          id: 'c1',
          templateId: 'strike',
          global_level: 50,
          uses_count: 0,
          modSlots: [{ status: 'filled', templateId: 'mod-damage-up', lm: 0 }],
          cooldownRemaining: 0,
        },
      ],
    })
    let s = campaignWithBattle(b)
    s = applyRunAction(s, {
      type: 'USE_CARD_ATTACK',
      cardId: 'c1',
      targetId: 'e1',
      randomInt1to100: 50,
    })
    expect(s.battle!.units.find((u) => u.id === 'e1')!.hp).toBe(460)
    expect(heroBattleCards(s.battle!)[0]!.modSlots).toEqual([])
  })
})

describe('item L triggers', () => {
  it('increments weapon itemLevel on strike when roll succeeds', () => {
    const b = makeBattle()
    let s = withHero(campaignWithBattle(b), {
      items: [{ id: 'w1', templateId: 'wooden_sword', itemLevel: 50, modSlots: [] }],
      equipment: { weapon: 'w1', armor: null, accessory: null },
    })
    s = applyRunAction(s, {
      type: 'USE_CARD_ATTACK',
      cardId: 'c1',
      targetId: 'e1',
      randomInt1to100: 50,
    })
    expect(hero(s).items.find((i) => i.id === 'w1')!.itemLevel).toBe(51)
  })

  it('skips weapon progression when weapon slot is empty (fists)', () => {
    const b = makeBattle()
    let s = campaignWithBattle(b)
    expect(hero(s).equipment.weapon).toBeNull()
    s = applyRunAction(s, {
      type: 'USE_CARD_ATTACK',
      cardId: 'c1',
      targetId: 'e1',
      randomInt1to100: 100,
    })
    expect(hero(s).items).toHaveLength(0)
  })

  it('increments armor itemLevel when player takes enemy damage', () => {
    const b = makeBattle({
      units: [
        unit({
          id: HERO_ID,
          side: 'player',
          x: 2,
          y: 2,
          hp: 100,
          maxHp: 100,
          unitLevel: 1,
        }),
        unit({
          id: 'e1',
          side: 'enemy',
          x: 3,
          y: 2,
          hp: 500,
          maxHp: 500,
          unitLevel: 1,
        }),
      ],
      currentTurnIndex: 0,
      turnOrder: ['e1', HERO_ID],
    })
    let s = withHero(campaignWithBattle(b), {
      items: [{ id: 'a1', templateId: 'leather_armor', itemLevel: 1, modSlots: [] }],
      equipment: { weapon: null, armor: 'a1', accessory: null },
    })
    s = applyRunAction(s, {
      type: 'BATTLE_DISPATCH',
      battleAction: {
        type: 'attack',
        attackerId: 'e1',
        targetId: HERO_ID,
        damage: 5,
        kind: 'melee',
      },
    })
    expect(hero(s).items.find((i) => i.id === 'a1')!.itemLevel).toBe(2)
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
          modSlots: [],
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
    expect(heroBattleCards(s.battle!).find((c) => c.id === 'c2')!.uses_count).toBe(1)
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
          modSlots: [],
          cooldownRemaining: 0,
        },
      ],
    })
    let s = campaignWithBattle(b)
    const before = heroBattleCards(s.battle!).find((c) => c.id === 'c2')!.uses_count
    s = applyRunAction(s, {
      type: 'USE_CARD_AOE',
      cardId: 'c2',
      targetX: 4,
      targetY: 4,
      randomInt1to100: 50,
    })
    expect(heroBattleCards(s.battle!).find((c) => c.id === 'c2')!.uses_count).toBe(before)
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
    const items = [{ id: 'w1', templateId: 'wooden_sword', itemLevel: 1, modSlots: [] }]
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
    const items = [{ id: 'w1', templateId: 'wooden_sword', itemLevel: 1, modSlots: [] }]
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

  it('SELL_CARD refunds half skill price and removes card', () => {
    let s = withClassicTestCards({ ...initialCampaignState(), gold: 0 })
    const healId = hero(s).cards.find((c) => c.templateId === 'heal')!.id
    s = applyRunAction(s, { type: 'SELL_CARD', characterId: HERO_ID, cardId: healId })
    expect(hero(s).cards.some((c) => c.id === healId)).toBe(false)
    expect(s.gold).toBe(50)
  })

  it('SELL_CARD no-op for strike and loadout cards', () => {
    let s = withClassicTestCards(initialCampaignState())
    const strikeId = hero(s).cards.find((c) => c.templateId === 'strike')!.id
    const beforeGold = s.gold
    s = applyRunAction(s, { type: 'SELL_CARD', characterId: HERO_ID, cardId: strikeId })
    expect(hero(s).cards.some((c) => c.id === strikeId)).toBe(true)
    expect(s.gold).toBe(beforeGold)

    s = applyRunAction(s, {
      type: 'SET_BATTLE_LOADOUT',
      characterId: HERO_ID,
      slotIndex: 1,
      cardId: hero(s).cards.find((c) => c.templateId === 'heal')!.id,
    })
    const healId = hero(s).battleLoadout[1]!
    const before = s
    s = applyRunAction(s, { type: 'SELL_CARD', characterId: HERO_ID, cardId: healId })
    expect(s).toEqual(before)
  })

  it('REORDER_CARDS changes card order when multiple cards', () => {
    let s = withClassicTestCards(initialCampaignState())
    s = applyRunAction(s, {
      type: 'REORDER_CARDS',
      characterId: HERO_ID,
      cardIds: ['c2', 'c1', 'c3'],
    })
    expect(hero(s).cards.map((c) => c.id)).toEqual(['c2', 'c1', 'c3'])
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
    const reserve = testCreateCharacter({
      id: 'char-2',
      name: 'Reserve',
      classId: 'mage',
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

  function battleSignature(b: BattleState): string {
    return JSON.stringify({
      phase: b.phase,
      turn: b.currentTurnIndex,
      round: b.roundNumber,
      units: b.units.map((u) => [u.id, u.hp, u.x, u.y]),
    })
  }

  function dispatchBattle(
    state: CampaignState,
    battleAction: BattleAction,
  ): { state: CampaignState; progressed: boolean } {
    if (!state.battle) return { state, progressed: false }
    const before = battleSignature(state.battle)
    const next = applyRunAction(state, { type: 'BATTLE_DISPATCH', battleAction })
    if (!next.battle) {
      return { state: next, progressed: true }
    }
    return {
      state: next,
      progressed: battleSignature(next.battle) !== before,
    }
  }

  function winCurrentBattle(s: CampaignState): CampaignState {
    let current = s
    let guard = 0
    while (current.battle?.phase === 'ongoing' && guard < 256) {
      guard++
      const b = current.battle!
      const actorId = getCurrentActorId(b)
      const beforeSig = battleSignature(b)
      const actor = actorId ? b.units.find((u) => u.id === actorId) : undefined
      if (actor?.side === 'player') {
        const enemy = b.units.find((u) => u.side === 'enemy' && u.hp > 0)
        if (!enemy) break
        let progressed = false
        let result = dispatchBattle(current, {
          type: 'attack',
          attackerId: actor.id,
          targetId: enemy.id,
          damage: 999,
          kind: 'ranged',
          maxRange: 10,
        })
        current = result.state
        progressed = result.progressed
        if (!progressed) {
          result = dispatchBattle(current, {
            type: 'attack',
            attackerId: actor.id,
            targetId: enemy.id,
            damage: 999,
            kind: 'melee',
          })
          current = result.state
          progressed = result.progressed
        }
        if (!progressed) {
          const walls = wallSet(b.walls)
          const reachable = reachableMoveCells(b, actor.id)
          const tryMove = (toX: number, toY: number) => {
            const moved = dispatchBattle(current, {
              type: 'move',
              unitId: actor.id,
              toX,
              toY,
            })
            if (moved.progressed) {
              current = moved.state
              progressed = true
            }
          }
          for (const key of reachable) {
            const [xs, ys] = key.split(',')
            const toX = Number(xs)
            const toY = Number(ys)
            const probe = { ...actor, x: toX, y: toY }
            if (canMeleeAttack(probe, enemy)) {
              tryMove(toX, toY)
              break
            }
          }
          if (!progressed) {
            for (const key of reachable) {
              const [xs, ys] = key.split(',')
              const toX = Number(xs)
              const toY = Number(ys)
              const probe = { ...actor, x: toX, y: toY }
              if (canRangedAttack(probe, enemy, 10, walls)) {
                tryMove(toX, toY)
                break
              }
            }
          }
          if (!progressed) {
            for (const key of reachable) {
              const [xs, ys] = key.split(',')
              tryMove(Number(xs), Number(ys))
              if (progressed) break
            }
          }
        }
      } else if (actor?.side === 'enemy') {
        let result = dispatchBattle(current, {
          type: 'move',
          unitId: actor.id,
          toX: Math.max(0, actor.x - 1),
          toY: actor.y,
        })
        current = result.state
        if (!result.progressed) {
          result = dispatchBattle(current, {
            type: 'move',
            unitId: actor.id,
            toX: Math.min(b.width - 1, actor.x + 1),
            toY: actor.y,
          })
          current = result.state
        }
      } else {
        break
      }
      if (!current.battle || current.battle.phase !== 'ongoing') break
      if (battleSignature(current.battle) === beforeSig) break
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

  it('full 3-battle expedition chain completes and returns to hub', () => {
    let s = applyRunAction(hubState(), {
      type: 'START_EXPEDITION',
      chainId: 'campaign-main',
      selectedCharacterIds: [HERO_ID],
    })

    expect(s.expedition!.battleCount).toBe(3)
    expect(s.expedition!.battleIndex).toBe(0)
    expect(s.phase).toBe('battle')

    s = winCurrentBattle(s)
    expect(s.phase).toBe('inter_battle')
    expect(s.expedition!.battleIndex).toBe(1)
    expect(s.battle).toBeNull()

    s = applyRunAction(s, { type: 'ADVANCE_EXPEDITION_BATTLE' })
    expect(s.phase).toBe('battle')
    expect(s.expedition!.battleIndex).toBe(1)

    s = winCurrentBattle(s)
    expect(s.phase).toBe('inter_battle')
    expect(s.expedition!.battleIndex).toBe(2)

    s = applyRunAction(s, { type: 'ADVANCE_EXPEDITION_BATTLE' })
    expect(s.phase).toBe('battle')
    expect(s.expedition!.battleIndex).toBe(2)

    s = winCurrentBattle(s)
    expect(s.phase).toBe('victory')
    expect(s.expedition).not.toBeNull()

    const goldBeforeFinalize = s.gold
    s = applyRunAction(s, {
      type: 'FINALIZE_VICTORY',
      itemLevelRolls: [],
      playerUnitLevelRoll: 50,
    })

    expect(s.phase).toBe('hub')
    expect(s.expedition).toBeNull()
    expect(s.battle).toBeNull()
    expect(s.gold).toBeGreaterThan(goldBeforeFinalize)
    expect(hero(s).unitLevel).toBeGreaterThan(1)
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

  it('defeat syncs expedition squad metaStatus to downed', () => {
    let s = applyRunAction(hubState(), {
      type: 'START_EXPEDITION',
      chainId: 'campaign-main',
      selectedCharacterIds: [HERO_ID],
    })

    s = loseCurrentBattle(s)
    expect(s.expedition!.squadSnapshot[0]!.metaStatus).toBe('downed')
  })

  it('applyMementoDeathRollsForDowned levels up downed character on successful roll', () => {
    const s = hubState()
    const battle: BattleState = {
      width: 4,
      height: 4,
      walls: [],
      units: [
        {
          id: HERO_ID,
          side: 'player',
          x: 0,
          y: 0,
          hp: 0,
          maxHp: 10,
          unitLevel: 1,
        },
      ],
      turnOrder: [HERO_ID],
      currentTurnIndex: 0,
      roundNumber: 1,
      phase: 'defeat',
      worldPower: 0,
      playerCardsByUnitId: {},
      battleLog: [],
      gearDamageMult: 1,
    gearStrikeDamageMult: 1,
    }
    const next = applyMementoDeathRollsForDowned(s, battle, () => 50)
    expect(hero(next).unitLevel).toBe(2)
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

describe('tavern', () => {
  function refreshedState(gold = 100) {
    return applyRunAction(
      { ...initialCampaignState(), gold },
      { type: 'REFRESH_TAVERN', seed: 42 },
    )
  }

  it('REFRESH_TAVERN generates 3 candidates and costs gold', () => {
    const state = refreshedState(50)
    expect(state.gold).toBe(50 - TAVERN_REFRESH_COST)
    expect(state.tavernCandidates).toHaveLength(3)
  })

  it('HIRE_TAVERN_CANDIDATE adds character with rolled gear equipped and starter cards', () => {
    const state = refreshedState(200)
    const candidate = state.tavernCandidates![0]!
    const next = applyRunAction(state, {
      type: 'HIRE_TAVERN_CANDIDATE',
      candidateId: candidate.candidateId,
    })

    expect(next.characters).toHaveLength(2)
    const hired = next.characters.find((c) => c.id !== HERO_ID)!
    expect(hired.classId).toBe(candidate.classId)
    expect(hired.cards.length).toBeGreaterThan(0)
    expect(hired.battleLoadout[0]).toBeTruthy()
    expect(next.gold).toBe(state.gold - candidate.price)
    expect(next.tavernCandidates).toHaveLength(2)

    for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const templateId = candidate.previewGear[slot]
      if (!templateId) continue
      const itemId = hired.equipment[slot]
      expect(itemId).toBeTruthy()
      const item = hired.items.find((i) => i.id === itemId)
      expect(item?.templateId).toBe(templateId)
    }
  })

  it('HIRE_TAVERN_CANDIDATE discovers class in codex', () => {
    const state = refreshedState(200)
    const candidate = state.tavernCandidates![0]!
    const next = applyRunAction(state, {
      type: 'HIRE_TAVERN_CANDIDATE',
      candidateId: candidate.candidateId,
    })
    expect(next.codexDiscovered).toContain(codexEntryId('class', candidate.classId))
  })

  it('rejects hire when roster is full', () => {
    let state = refreshedState(10_000)
    const characters = [getPrimaryCharacter(state)]
    for (let i = 0; i < MAX_ROSTER_SIZE - 1; i++) {
      characters.push(
        testCreateCharacter({
          id: `char-reserve-${i}`,
          name: `Reserve ${i}`,
          classId: 'warrior',
        }),
      )
    }
    state = { ...state, characters }
    const candidate = state.tavernCandidates![0]!

    const next = applyRunAction(state, {
      type: 'HIRE_TAVERN_CANDIDATE',
      candidateId: candidate.candidateId,
    })
    expect(next).toBe(state)
    expect(next.characters).toHaveLength(MAX_ROSTER_SIZE)
  })

  it('blocks refresh and hire during expedition', () => {
    const hub = refreshedState(200)
    const expedition = applyRunAction(hub, {
      type: 'START_EXPEDITION',
      chainId: 'campaign-main',
      selectedCharacterIds: [HERO_ID],
    })

    const refreshBlocked = applyRunAction(expedition, { type: 'REFRESH_TAVERN', seed: 1 })
    expect(refreshBlocked).toBe(expedition)

    const candidate = hub.tavernCandidates![0]!
    const hireBlocked = applyRunAction(expedition, {
      type: 'HIRE_TAVERN_CANDIDATE',
      candidateId: candidate.candidateId,
    })
    expect(hireBlocked).toBe(expedition)
    expect(hireBlocked.characters).toHaveLength(1)
  })
})

describe('mod hub actions', () => {
  function fireballOffer(seed: number): ModOffer {
    return generateOffer(
      MOD_OFFER_POOL,
      resolveCarrierTags('card', 'fireball'),
      [],
      0,
      seed,
    )
  }

  function hubWithFireballModOffer(offer = fireballOffer(4242)) {
    let s = initialCampaignState()
    const fireball = {
      ...createCardInstance('fireball', 'c2'),
      global_level: MOD_SLOT_MILESTONES.firstThreshold,
      modSlots: [{ status: 'empty' as const, offer }],
    }
    return withHero(s, { cards: [...hero(s).cards, fireball] })
  }

  it('PICK_MOD_OFFER validates modId in pending offer and fills slot with lm=0', () => {
    const offer = fireballOffer(99)
    let s = hubWithFireballModOffer(offer)
    const modId = offer.modIds[1]!

    s = applyRunAction(s, {
      type: 'PICK_MOD_OFFER',
      characterId: HERO_ID,
      carrierKind: 'card',
      carrierId: 'c2',
      slotIndex: 0,
      modTemplateId: modId,
    })

    const card = hero(s).cards.find((c) => c.id === 'c2')!
    expect(card.modSlots[0]).toEqual({ status: 'filled', templateId: modId, lm: 0 })
  })

  it('PICK_MOD_OFFER rejects modId not in offer', () => {
    const s = hubWithFireballModOffer()
    const next = applyRunAction(s, {
      type: 'PICK_MOD_OFFER',
      characterId: HERO_ID,
      carrierKind: 'card',
      carrierId: 'c2',
      slotIndex: 0,
      modTemplateId: 'mod-not-in-offer',
    })
    expect(next).toEqual(s)
  })

  it('REMOVE_MOD on slot 1 rolls back L and regenerates offer; higher slot unchanged', () => {
    const slot2Filled: ModSlotState = {
      status: 'filled',
      templateId: 'mod-aoe-size',
      lm: 5,
    }
    const slot1Filled: ModSlotState = {
      status: 'filled',
      templateId: 'mod-damage-up',
      lm: 3,
    }
    const startLevel = milestoneThreshold(2) + 7
    let s = initialCampaignState()
    const fireball = {
      ...createCardInstance('fireball', 'c2'),
      global_level: startLevel,
      modSlots: [
        { status: 'empty' as const, offer: fireballOffer(1) },
        slot1Filled,
        slot2Filled,
      ],
    }
    s = withHero(s, { cards: [...hero(s).cards, fireball] })

    s = applyRunAction(s, {
      type: 'REMOVE_MOD',
      characterId: HERO_ID,
      carrierKind: 'card',
      carrierId: 'c2',
      slotIndex: 1,
    })

    const card = hero(s).cards.find((c) => c.id === 'c2')!
    expect(card.global_level).toBe(rollbackCarrierLevel(1))
    expect(card.modSlots[1]).toMatchObject({ status: 'empty' })
    expect(card.modSlots[1]).toHaveProperty('offer')
    expect((card.modSlots[1] as { offer: ModOffer }).offer?.modIds).toHaveLength(3)
    expect(card.modSlots[2]).toEqual(slot2Filled)
  })

  it('mod actions no-op in battle', () => {
    const s = hubWithFireballModOffer()
    const inBattle = applyRunAction(s, { type: 'START_OR_CONTINUE_BATTLE' })
    const offer = fireballOffer(4242)
    const modId = offer.modIds[0]!
    const next = applyRunAction(inBattle, {
      type: 'PICK_MOD_OFFER',
      characterId: HERO_ID,
      carrierKind: 'card',
      carrierId: 'c2',
      slotIndex: 0,
      modTemplateId: modId,
    })
    expect(next).toEqual(inBattle)
  })

  it('mod actions blocked during expedition', () => {
    const hub = hubWithFireballModOffer()
    const expedition = applyRunAction(hub, {
      type: 'START_EXPEDITION',
      chainId: 'campaign-main',
      selectedCharacterIds: [HERO_ID],
    })
    const modId = fireballOffer(4242).modIds[0]!
    const next = applyRunAction(expedition, {
      type: 'PICK_MOD_OFFER',
      characterId: HERO_ID,
      carrierKind: 'card',
      carrierId: 'c2',
      slotIndex: 0,
      modTemplateId: modId,
    })
    expect(next).toEqual(expedition)
  })
})

describe('character appearance actions', () => {
  it('RENAME_CHARACTER trims and enforces length', () => {
    const s = initialCampaignState()
    const id = s.characters[0]!.id
    const next = applyRunAction(s, { type: 'RENAME_CHARACTER', characterId: id, name: '  Bob  ' })
    expect(getCharacter(next, id)?.name).toBe('Bob')
    const rejected = applyRunAction(next, { type: 'RENAME_CHARACTER', characterId: id, name: '' })
    expect(getCharacter(rejected, id)?.name).toBe('Bob')
  })

  it('SET_CHARACTER_APPEARANCE validates catalog', () => {
    const s = initialCampaignState()
    const id = s.characters[0]!.id
    const next = applyRunAction(s, {
      type: 'SET_CHARACTER_APPEARANCE',
      characterId: id,
      iconEmoji: '🗡️',
      iconAccent: 'green',
      iconSkinTone: 'medium',
    })
    expect(getCharacter(next, id)?.iconEmoji).toBe('🗡️')
    expect(getCharacter(next, id)?.iconAccent).toBe('green')
  })
})

describe('victory mod Lm rolls', () => {
  it('rolls lm on filled card mod slots when battle becomes victory', () => {
    const modSlots: ModSlotState[] = [
      { status: 'filled', templateId: 'mod-damage-up', lm: 0 },
    ]
    const b = makeBattle({
      phase: 'ongoing',
      playerCards: [
        {
          id: 'c1',
          templateId: 'strike',
          global_level: 50,
          uses_count: 0,
          modSlots,
          cooldownRemaining: 0,
        },
      ],
    })
    let s = campaignWithBattle(b)
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
    const battleCard = heroBattleCards(s.battle!)[0]!
    expect(battleCard.modSlots[0]).toEqual({
      status: 'filled',
      templateId: 'mod-damage-up',
      lm: 1,
    })
  })

  it('discovers mod codex entry when lm goes from 0 to 1 on victory', () => {
    const modSlots: ModSlotState[] = [
      { status: 'filled', templateId: 'mod-damage-up', lm: 0 },
    ]
    const b = makeBattle({
      phase: 'ongoing',
      playerCards: [
        {
          id: 'c1',
          templateId: 'strike',
          global_level: 50,
          uses_count: 0,
          modSlots,
          cooldownRemaining: 0,
        },
      ],
    })
    let s = campaignWithBattle(b)
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
    expect(s.codexDiscovered).toContain(codexEntryId('mod', 'mod-damage-up'))
  })

  it('rolls lm on equipped item mod slots on victory', () => {
    const modSlots: ModSlotState[] = [
      { status: 'filled', templateId: 'mod-hp-bonus-armor', lm: 0 },
    ]
    const init = initialCampaignState()
    const items = [
      { id: 'w1', templateId: 'wooden_sword', itemLevel: 1, modSlots },
    ]
    const s0 = withHero(init, {
      items,
      equipment: { weapon: 'w1', armor: null, accessory: null },
    })
    const b = makeBattle({ phase: 'ongoing' })
    const snap = battleSnapshotFromHero(s0)
    let s: CampaignState = {
      ...s0,
      phase: 'battle',
      battle: b,
      battleAttemptSnapshot: snap,
    }
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
    const item = hero(s).items.find((i) => i.id === 'w1')!
    expect(item.modSlots[0]).toEqual({
      status: 'filled',
      templateId: 'mod-hp-bonus-armor',
      lm: 1,
    })
  })

  it('persists rolled modSlots through FINALIZE_VICTORY merge', () => {
    const modSlots: ModSlotState[] = [
      { status: 'filled', templateId: 'mod-damage-up', lm: 0 },
    ]
    const b = makeBattle({
      phase: 'victory',
      playerCards: [
        {
          id: 'c1',
          templateId: 'strike',
          global_level: 50,
          uses_count: 0,
          modSlots: [{ status: 'filled', templateId: 'mod-damage-up', lm: 1 }],
          cooldownRemaining: 0,
        },
      ],
    })
    const init = withClassicTestCards(initialCampaignState())
    const cards = init.characters[0]!.cards.map((c) =>
      c.id === 'c1' ? { ...c, modSlots } : c,
    )
    let s: CampaignState = {
      ...init,
      characters: [{ ...init.characters[0]!, cards }],
      phase: 'victory',
      battle: b,
      battleAttemptSnapshot: battleSnapshotFromHero(init),
    }
    s = applyRunAction(s, {
      type: 'FINALIZE_VICTORY',
      itemLevelRolls: [],
      playerUnitLevelRoll: 50,
    })
    const card = hero(s).cards.find((c) => c.id === 'c1')!
    expect(card.modSlots[0]).toEqual({
      status: 'filled',
      templateId: 'mod-damage-up',
      lm: 1,
    })
  })
})

describe('chest and shop offers', () => {
  it('REFRESH_SHOP is free when shopOffers is null', () => {
    let s: CampaignState = { ...initialCampaignState(), gold: 50, shopOffers: null }
    s = applyRunAction(s, { type: 'REFRESH_SHOP', seed: 42, free: true })
    expect(s.gold).toBe(50)
    expect(s.shopOffers).not.toBeNull()
    expect(s.shopOffers!.length).toBeGreaterThanOrEqual(5)
  })

  it('REFRESH_SHOP deducts gold when not free', () => {
    let s: CampaignState = {
      ...initialCampaignState(),
      gold: SKILL_ACQUISITION.shopRefreshCost + 5,
      shopOffers: [{ kind: 'item' as const, templateId: 'wooden_sword' }],
    }
    s = applyRunAction(s, { type: 'REFRESH_SHOP', seed: 99 })
    expect(s.gold).toBe(5)
    expect(s.shopOffers!.length).toBeGreaterThanOrEqual(5)
  })

  it('BUY_SHOP_OFFER skill adds card to chest', () => {
    let s: CampaignState = {
      ...initialCampaignState(),
      gold: SKILL_ACQUISITION.shopSkillPrice,
      shopOffers: [{ kind: 'skill' as const, templateId: 'fireball' }],
    }
    s = applyRunAction(s, { type: 'BUY_SHOP_OFFER', offerIndex: 0 })
    expect(s.gold).toBe(0)
    expect(s.chest.unboundCards).toHaveLength(1)
    expect(s.chest.unboundCards[0]!.templateId).toBe('fireball')
    expect(s.shopOffers).toHaveLength(0)
    expect(s.codexDiscovered).toContain(codexEntryId('card', 'fireball'))
  })

  it('BUY_SHOP_OFFER item defaults to chest', () => {
    let s: CampaignState = {
      ...initialCampaignState(),
      gold: 100,
      shopOffers: [{ kind: 'item' as const, templateId: 'wooden_sword' }],
    }
    s = applyRunAction(s, { type: 'BUY_SHOP_OFFER', offerIndex: 0 })
    expect(s.chest.items).toHaveLength(1)
    expect(s.chest.items[0]!.templateId).toBe('wooden_sword')
    expect(hero(s).items).toHaveLength(0)
  })

  it('BIND_CHEST_CARD moves card to character permanently', () => {
    const card = createCardInstance('fireball', 'unbound-1')
    let s: CampaignState = {
      ...initialCampaignState(),
      chest: { items: [], unboundCards: [card] },
    }
    s = applyRunAction(s, {
      type: 'BIND_CHEST_CARD',
      cardId: 'unbound-1',
      characterId: HERO_ID,
    })
    expect(s.chest.unboundCards).toHaveLength(0)
    expect(hero(s).cards.some((c) => c.id === 'unbound-1')).toBe(true)
  })

  it('MOVE_CHEST_ITEM_TO_CHARACTER transfers stash item', () => {
    const item = { id: 'i1', templateId: 'wooden_sword', itemLevel: 1, modSlots: [] }
    let s: CampaignState = {
      ...initialCampaignState(),
      chest: { items: [item], unboundCards: [] },
    }
    s = applyRunAction(s, {
      type: 'MOVE_CHEST_ITEM_TO_CHARACTER',
      itemId: 'i1',
      characterId: HERO_ID,
    })
    expect(s.chest.items).toHaveLength(0)
    expect(hero(s).items.some((i) => i.id === 'i1')).toBe(true)
  })

  it('MOVE_CHARACTER_ITEM_TO_CHEST moves unequipped item', () => {
    const item = { id: 'i1', templateId: 'wooden_sword', itemLevel: 1, modSlots: [] }
    let s = withHero(initialCampaignState(), { items: [item] })
    s = applyRunAction(s, {
      type: 'MOVE_CHARACTER_ITEM_TO_CHEST',
      itemId: 'i1',
      characterId: HERO_ID,
    })
    expect(hero(s).items).toHaveLength(0)
    expect(s.chest.items.some((i) => i.id === 'i1')).toBe(true)
  })

  it('SELL_CHEST_ITEM adds gold and removes item', () => {
    const item = { id: 'i1', templateId: 'wooden_sword', itemLevel: 1, modSlots: [] }
    let s: CampaignState = {
      ...initialCampaignState(),
      gold: 0,
      chest: { items: [item], unboundCards: [] },
    }
    s = applyRunAction(s, { type: 'SELL_CHEST_ITEM', itemId: 'i1' })
    expect(s.chest.items).toHaveLength(0)
    expect(s.gold).toBeGreaterThan(0)
  })

  it('SELL_CHEST_CARD adds gold and removes unbound card', () => {
    const card = createCardInstance('fireball', 'chest-fb')
    let s: CampaignState = {
      ...initialCampaignState(),
      gold: 0,
      chest: { items: [], unboundCards: [card] },
    }
    s = applyRunAction(s, { type: 'SELL_CHEST_CARD', cardId: 'chest-fb' })
    expect(s.chest.unboundCards).toHaveLength(0)
    expect(s.gold).toBe(50)
  })
})
