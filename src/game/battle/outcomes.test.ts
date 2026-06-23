import { describe, expect, it } from 'vitest'
import { LEGACY_HERO_CHARACTER_ID } from '../character/constants'
import type { BattlePlayerCard, BattleState, Expedition, Unit } from '../types'
import { advanceTurn } from './initiative'
import {
  downedPlayerUnitIds,
  isPartyWipe,
  syncDownedAfterBattle,
} from './outcomes'
import { applyAction, WORLD_POWER_PER_ENEMY_KILL } from './reducer'

const HERO_ID = LEGACY_HERO_CHARACTER_ID
const ALLY_ID = 'char-ally-1'

function unit(partial: Unit): Unit {
  return partial
}

const defaultCard = (id: string): BattlePlayerCard => ({
  id,
  templateId: 't1',
  global_level: 75,
  uses_count: 0,
  modSlots: [{ status: 'filled', templateId: 'mod-damage-up', lm: 0 }],
  cooldownRemaining: 0,
})

function battle(overrides: Partial<BattleState> = {}): BattleState {
  const base: BattleState = {
    width: 4,
    height: 4,
    walls: [],
    units: [
      unit({
        id: HERO_ID,
        side: 'player',
        x: 1,
        y: 0,
        hp: 10,
        maxHp: 10,
        unitLevel: 1,
      }),
      unit({
        id: 'e1',
        side: 'enemy',
        x: 2,
        y: 0,
        hp: 1,
        maxHp: 5,
        unitLevel: 1,
      }),
    ],
    turnOrder: [HERO_ID, 'e1'],
    currentTurnIndex: 0,
    roundNumber: 1,
    phase: 'ongoing',
    worldPower: 0,
    playerCardsByUnitId: {},
    battleLog: [],
    gearDamageMult: 1,
    gearStrikeDamageMult: 1,
  }
  return { ...base, ...overrides, units: overrides.units ?? base.units }
}

function expeditionWithHero(): Expedition {
  return {
    scenarioChainId: 'campaign-main',
    partySize: 2,
    squadSnapshot: [
      {
        characterId: HERO_ID,
        equipment: { weapon: null, armor: null, accessory: null },
        battleLoadout: ['c1', 'c2'],
        metaStatus: 'active',
      },
      {
        characterId: ALLY_ID,
        equipment: { weapon: null, armor: null, accessory: null },
        battleLoadout: ['c1', null],
        metaStatus: 'active',
      },
    ],
    battleIndex: 0,
    battleCount: 3,
    shopLocked: true,
  }
}

describe('isPartyWipe', () => {
  it('is false when any player unit has hp > 0', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 0, maxHp: 10, unitLevel: 1 }),
        unit({ id: ALLY_ID, side: 'player', x: 1, y: 0, hp: 5, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 2, y: 0, hp: 5, maxHp: 5, unitLevel: 1 }),
      ],
    })
    expect(isPartyWipe(s)).toBe(false)
  })

  it('is true when all player units have hp === 0', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 0, maxHp: 10, unitLevel: 1 }),
        unit({ id: ALLY_ID, side: 'player', x: 1, y: 0, hp: 0, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 2, y: 0, hp: 5, maxHp: 5, unitLevel: 1 }),
      ],
    })
    expect(isPartyWipe(s)).toBe(true)
  })
})

describe('syncDownedAfterBattle', () => {
  it('marks expedition slots downed when matching battle unit hp is 0', () => {
    const exp = expeditionWithHero()
    const b = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 0, maxHp: 10, unitLevel: 1 }),
        unit({ id: ALLY_ID, side: 'player', x: 1, y: 0, hp: 8, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 2, y: 0, hp: 5, maxHp: 5, unitLevel: 1 }),
      ],
    })
    const snap = syncDownedAfterBattle(exp, b)
    expect(snap[0]!.metaStatus).toBe('downed')
    expect(snap[1]!.metaStatus).toBe('active')
  })
})

describe('downed units and turn order', () => {
  it('excludes player at hp 0 from next round turn order', () => {
    const units = [
      unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 0, maxHp: 10, unitLevel: 1, initiativeBase: 20 }),
      unit({ id: ALLY_ID, side: 'player', x: 1, y: 0, hp: 10, maxHp: 10, unitLevel: 1, initiativeBase: 8 }),
      unit({ id: 'e1', side: 'enemy', x: 2, y: 0, hp: 5, maxHp: 5, unitLevel: 1, initiativeBase: 5 }),
    ]
    const s = battle({
      units,
      turnOrder: [HERO_ID, ALLY_ID, 'e1'],
      currentTurnIndex: 2,
    })
    const next = advanceTurn(s)
    expect(next.roundNumber).toBe(2)
    expect(next.turnOrder).toEqual([ALLY_ID, 'e1'])
    expect(next.currentTurnIndex).toBe(0)
  })

  it('does not trigger defeat while one ally remains alive', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 1, maxHp: 10, unitLevel: 1 }),
        unit({ id: ALLY_ID, side: 'player', x: 1, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 2, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
      ],
      turnOrder: [HERO_ID, ALLY_ID, 'e1'],
      currentTurnIndex: 2,
    })
    const end = applyAction(s, {
      type: 'attack',
      attackerId: 'e1',
      targetId: HERO_ID,
      damage: 5,
      kind: 'ranged',
      maxRange: 10,
    })
    expect(end.phase).toBe('ongoing')
    expect(downedPlayerUnitIds(end)).toEqual([HERO_ID])
  })
})

describe('battle outcomes (kills & defeat)', () => {
  it('enemy death increases worldPower by fixed step', () => {
    const card = defaultCard('c1')
    const s = battle({
      worldPower: 2,
      playerCardsByUnitId: { [HERO_ID]: [card] },
    })
    const end = applyAction(s, {
      type: 'attack',
      attackerId: HERO_ID,
      targetId: 'e1',
      damage: 2,
      kind: 'melee',
    })
    expect(end.worldPower).toBe(2 + WORLD_POWER_PER_ENEMY_KILL)
  })

  it('party wipe defeat does not change worldPower', () => {
    const s = battle({
      worldPower: 7,
      units: [
        unit({
          id: HERO_ID,
          side: 'player',
          x: 1,
          y: 0,
          hp: 1,
          maxHp: 10,
          unitLevel: 1,
        }),
        unit({
          id: 'e1',
          side: 'enemy',
          x: 2,
          y: 0,
          hp: 10,
          maxHp: 10,
          unitLevel: 1,
        }),
      ],
      currentTurnIndex: 1,
      turnOrder: [HERO_ID, 'e1'],
    })
    const end = applyAction(s, {
      type: 'attack',
      attackerId: 'e1',
      targetId: HERO_ID,
      damage: 5,
      kind: 'melee',
    })
    expect(end.phase).toBe('defeat')
    expect(end.worldPower).toBe(7)
    expect(isPartyWipe(end)).toBe(true)
  })

  it('party wipe when all player units reach 0 hp', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 1, maxHp: 10, unitLevel: 1 }),
        unit({ id: ALLY_ID, side: 'player', x: 1, y: 0, hp: 1, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 2, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
      ],
      turnOrder: [HERO_ID, ALLY_ID, 'e1'],
      currentTurnIndex: 2,
    })
    const end = applyAction(s, {
      type: 'aoe_strike',
      attackerId: 'e1',
      centerX: 0,
      centerY: 0,
      damage: 5,
      aoeSize: 2,
    })
    expect(end.phase).toBe('defeat')
    expect(isPartyWipe(end)).toBe(true)
  })
})
