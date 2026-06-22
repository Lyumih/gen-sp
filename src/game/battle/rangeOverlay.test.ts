import { describe, expect, it } from 'vitest'
import { LEGACY_HERO_CHARACTER_ID } from '../character/constants'
import type { BattleState, Unit } from '../types'
import { cellKey } from './grid'
import {
  aggregateEnemyThreatCells,
  canCastAoEAt,
  cellsInAoE,
  cellsInManhattanRange,
  enemyThreatCells,
  reachableMoveCells,
  validHealTargetCells,
} from './rangeOverlay'

const HERO_ID = LEGACY_HERO_CHARACTER_ID

function unit(partial: Unit): Unit {
  return partial
}

function battle(overrides: Partial<BattleState> = {}): BattleState {
  const base: BattleState = {
    width: 5,
    height: 5,
    walls: [],
    units: [
      unit({ id: HERO_ID, side: 'player', x: 2, y: 2, hp: 10, maxHp: 10, unitLevel: 1 }),
      unit({ id: 'e1', side: 'enemy', x: 0, y: 0, hp: 5, maxHp: 5, unitLevel: 1 }),
    ],
    turnOrder: [HERO_ID, 'e1'],
    currentTurnIndex: 0,
    roundNumber: 1,
    phase: 'ongoing',
    worldPower: 0,
    playerCardsByUnitId: {},
    battleLog: [],
    gearCardLevelBonus: 0,
  }
  return { ...base, ...overrides, units: overrides.units ?? base.units }
}

describe('cellsInManhattanRange', () => {
  it('returns disk with min and max inclusive', () => {
    const s = cellsInManhattanRange(2, 2, 1, 2, 5, 5)
    expect(s.has(cellKey(2, 2))).toBe(false)
    expect(s.has(cellKey(2, 1))).toBe(true)
    expect(s.has(cellKey(4, 2))).toBe(true)
    expect(s.has(cellKey(0, 0))).toBe(false)
  })
})

describe('cellsInAoE', () => {
  it('returns 3x3 centered on cell clipped to bounds', () => {
    const s = cellsInAoE(0, 0, 3, 5, 5)
    expect(s.size).toBe(4)
    expect(s.has(cellKey(0, 0))).toBe(true)
    expect(s.has(cellKey(1, 1))).toBe(true)
    expect(s.has(cellKey(2, 2))).toBe(false)
  })

  it('returns full 3x3 in center of grid', () => {
    const s = cellsInAoE(2, 2, 3, 5, 5)
    expect(s.size).toBe(9)
  })
})

describe('reachableMoveCells', () => {
  it('returns free orthogonal neighbors only when maxSteps is 1', () => {
    const s = battle({ walls: [cellKey(2, 1)] })
    const moves = reachableMoveCells(s, HERO_ID, 1)
    expect(moves.has(cellKey(2, 1))).toBe(false)
    expect(moves.has(cellKey(3, 2))).toBe(true)
    expect(moves.size).toBe(3)
  })

  it('returns multi-step reachable cells via BFS', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 4, y: 0, hp: 5, maxHp: 5, unitLevel: 1 }),
      ],
    })
    const moves = reachableMoveCells(s, HERO_ID, 3)
    expect(moves.has(cellKey(3, 0))).toBe(true)
    expect(moves.has(cellKey(4, 0))).toBe(false)
  })
})

describe('enemyThreatCells', () => {
  it('includes melee neighbors and ranged disk for enemy', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 2, y: 2, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 0, y: 0, hp: 5, maxHp: 5, unitLevel: 1 }),
      ],
    })
    const threat = enemyThreatCells(s, 'e1')
    expect(threat.has(cellKey(0, 1))).toBe(true)
    expect(threat.has(cellKey(1, 0))).toBe(true)
    expect(threat.has(cellKey(0, 8))).toBe(false)
  })
})

describe('aggregateEnemyThreatCells', () => {
  it('unions all enemy zones', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 2, y: 2, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 0, y: 0, hp: 5, maxHp: 5, unitLevel: 1 }),
        unit({ id: 'e2', side: 'enemy', x: 4, y: 4, hp: 5, maxHp: 5, unitLevel: 1 }),
      ],
    })
    const agg = aggregateEnemyThreatCells(s)
    expect(agg.has(cellKey(0, 1))).toBe(true)
    expect(agg.has(cellKey(3, 4))).toBe(true)
  })
})

describe('canCastAoEAt', () => {
  it('allows cast within manhattan castRange', () => {
    const hero = unit({
      id: HERO_ID,
      side: 'player',
      x: 2,
      y: 2,
      hp: 10,
      maxHp: 10,
      unitLevel: 1,
    })
    expect(canCastAoEAt(hero, 2, 3, 3)).toBe(true)
    expect(canCastAoEAt(hero, 0, 0, 3)).toBe(false)
  })
})

describe('validHealTargetCells', () => {
  it('includes injured ally in range', () => {
    const hero = unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 5, maxHp: 10, unitLevel: 1 })
    const s = battle({ units: [hero] })
    const cells = validHealTargetCells(s, hero, 2)
    expect(cells.has(cellKey(0, 0))).toBe(true)
  })

  it('excludes full hp ally', () => {
    const hero = unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 })
    const s = battle({ units: [hero] })
    const cells = validHealTargetCells(s, hero, 2)
    expect(cells.size).toBe(0)
  })
})
