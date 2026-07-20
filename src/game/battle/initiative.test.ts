import { describe, expect, it } from 'vitest'
import { TEST_BASE_STATS } from '../stats/testFixtures'
import type { BattleState, Unit } from '../types'
import {
  advanceTurn,
  buildRoundTurnOrder,
  computeUnitInitiative,
} from './initiative'

function unit(partial: Unit): Unit {
  return partial
}

describe('computeUnitInitiative', () => {
  it('uses initiativeBase with default 10', () => {
    expect(computeUnitInitiative(unit({ id: 'a', side: 'player', x: 0, y: 0, hp: 1, maxHp: 1, unitLevel: 1 }))).toBe(10)
    expect(
      computeUnitInitiative(
        unit({
          id: 'a',
          side: 'player',
          x: 0,
          y: 0,
          hp: 1,
          maxHp: 1,
          unitLevel: 1,
          initiativeBase: 14,
        }),
      ),
    ).toBe(14)
  })

  it('adds gear and battle buff bonuses', () => {
    const u = unit({
      id: 'a',
      side: 'player',
      x: 0,
      y: 0,
      hp: 1,
      maxHp: 1,
      unitLevel: 1,
      initiativeBase: 8,
    })
    expect(computeUnitInitiative(u, { gearBonus: 2, battleBuffs: 1 })).toBe(11)
  })
})

describe('buildRoundTurnOrder', () => {
  it('sorts by descending initiative with stable unitId tie-break', () => {
    const units = [
      unit({ id: 'slow', side: 'enemy', x: 0, y: 0, hp: 5, maxHp: 5, unitLevel: 1, initiativeBase: 5 }),
      unit({ id: 'fast', side: 'player', x: 1, y: 0, hp: 5, maxHp: 5, unitLevel: 1, initiativeBase: 12 }),
      unit({ id: 'mid', side: 'enemy', x: 2, y: 0, hp: 5, maxHp: 5, unitLevel: 1, initiativeBase: 10 }),
    ]
    expect(buildRoundTurnOrder(units)).toEqual(['fast', 'mid', 'slow'])
  })

  it('breaks equal initiative by unit id', () => {
    const units = [
      unit({ id: 'b', side: 'enemy', x: 0, y: 0, hp: 5, maxHp: 5, unitLevel: 1, initiativeBase: 10 }),
      unit({ id: 'a', side: 'player', x: 1, y: 0, hp: 5, maxHp: 5, unitLevel: 1, initiativeBase: 10 }),
    ]
    expect(buildRoundTurnOrder(units)).toEqual(['a', 'b'])
  })

  it('excludes downed units', () => {
    const units = [
      unit({ id: 'hero', side: 'player', x: 0, y: 0, hp: 0, maxHp: 10, unitLevel: 1, initiativeBase: 20 }),
      unit({ id: 'e1', side: 'enemy', x: 1, y: 0, hp: 5, maxHp: 5, unitLevel: 1, initiativeBase: 5 }),
    ]
    expect(buildRoundTurnOrder(units)).toEqual(['e1'])
  })

  it('applies per-unit gear bonuses from context', () => {
    const units = [
      unit({ id: 'a', side: 'player', x: 0, y: 0, hp: 5, maxHp: 5, unitLevel: 1, initiativeBase: 10 }),
      unit({ id: 'b', side: 'enemy', x: 1, y: 0, hp: 5, maxHp: 5, unitLevel: 1, initiativeBase: 10 }),
    ]
    expect(buildRoundTurnOrder(units, { gearBonusByUnitId: { b: 3 } })).toEqual(['b', 'a'])
  })
})

describe('advanceTurn', () => {
  function battle(overrides: Partial<BattleState>): BattleState {
    return {
      width: 4,
      height: 4,
      walls: [],
      units: [],
      turnOrder: [],
      currentTurnIndex: 0,
      roundNumber: 1,
      phase: 'ongoing',
      worldPower: 0,
      playerCardsByUnitId: {},
      battleLog: [],
      gearDamageMult: 1,
      gearStrikeDamageMult: 1,
      ...overrides,
    }
  }

  it('increments roundNumber and rebuilds turn order when the queue wraps', () => {
    const units = [
      unit({ id: 'hero', side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1, initiativeBase: 12 }),
      unit({ id: 'e1', side: 'enemy', x: 2, y: 0, hp: 5, maxHp: 5, unitLevel: 1, initiativeBase: 8 }),
    ]
    const s = battle({
      units,
      turnOrder: ['hero', 'e1'],
      currentTurnIndex: 1,
    })
    const next = advanceTurn(s)
    expect(next.roundNumber).toBe(2)
    expect(next.turnOrder).toEqual(['hero', 'e1'])
    expect(next.currentTurnIndex).toBe(0)
  })

  it('re-sorts turn order on new round when initiative values differ', () => {
    const units = [
      unit({ id: 'hero', side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1, initiativeBase: 8 }),
      unit({ id: 'e1', side: 'enemy', x: 2, y: 0, hp: 5, maxHp: 5, unitLevel: 1, initiativeBase: 12 }),
    ]
    const s = battle({
      units,
      turnOrder: ['hero', 'e1'],
      currentTurnIndex: 0,
    })
    const mid = advanceTurn(s)
    expect(mid.currentTurnIndex).toBe(1)
    expect(mid.roundNumber).toBe(1)

    const next = advanceTurn({ ...mid, units })
    expect(next.roundNumber).toBe(2)
    expect(next.turnOrder).toEqual(['e1', 'hero'])
    expect(next.currentTurnIndex).toBe(0)
  })

  it('regenerates mana for the new actor at turn start', () => {
    const units = [
      unit({
        id: 'enemy',
        side: 'enemy',
        x: 2,
        y: 0,
        hp: 5,
        maxHp: 5,
        unitLevel: 1,
        mana: 30,
        maxMana: 30,
        baseStats: { ...TEST_BASE_STATS, mana: 30, manaRegen: 0 },
      }),
      unit({
        id: 'hero',
        side: 'player',
        x: 0,
        y: 0,
        hp: 10,
        maxHp: 10,
        unitLevel: 1,
        mana: 10,
        maxMana: 30,
        baseStats: { ...TEST_BASE_STATS, mana: 30, manaRegen: 5 },
      }),
    ]
    const next = advanceTurn(
      battle({
        units,
        turnOrder: ['enemy', 'hero'],
        currentTurnIndex: 0,
      }),
    )

    const actor = next.units.find(
      (candidate) => candidate.id === next.turnOrder[next.currentTurnIndex],
    )
    expect(actor?.id).toBe('hero')
    expect(actor?.mana).toBe(15)
  })
})
