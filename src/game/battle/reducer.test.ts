import { describe, expect, it } from 'vitest'
import type { BattleState, Unit } from '../types'
import { cellKey, manhattan, orthoNeighbors } from './grid'
import { applyAction } from './reducer'

function unit(partial: Unit): Unit {
  return partial
}

function battle(overrides: Partial<BattleState> = {}): BattleState {
  const base: BattleState = {
    width: 4,
    height: 4,
    walls: [],
    units: [
      unit({
        id: 'hero',
        side: 'player',
        x: 0,
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
        hp: 5,
        maxHp: 5,
        unitLevel: 1,
      }),
    ],
    turnOrder: ['hero', 'e1'],
    currentTurnIndex: 0,
    phase: 'ongoing',
    worldPower: 0,
    playerCards: [],
    modKillTargetCardId: null,
    battleLog: [],
    gearCardLevelBonus: 0,
  }
  return { ...base, ...overrides, units: overrides.units ?? base.units }
}

describe('grid helpers', () => {
  it('manhattan distance', () => {
    expect(manhattan(0, 0, 2, 1)).toBe(3)
    expect(manhattan(1, 1, 1, 1)).toBe(0)
  })

  it('ortho neighbors are only N/E/S/W', () => {
    const n = orthoNeighbors(1, 1)
    expect(n).toHaveLength(4)
    const set = new Set(n.map(([x, y]) => cellKey(x, y)))
    expect(set.has(cellKey(1, 0))).toBe(true)
    expect(set.has(cellKey(2, 1))).toBe(true)
    expect(set.has(cellKey(1, 2))).toBe(true)
    expect(set.has(cellKey(0, 1))).toBe(true)
    expect(set.has(cellKey(2, 2))).toBe(false)
  })
})

describe('applyAction move', () => {
  it('rejects move into wall', () => {
    const s = battle({ walls: [cellKey(1, 0)] })
    const next = applyAction(s, { type: 'move', unitId: 'hero', toX: 1, toY: 0 })
    expect(next).toBe(s)
    expect(next.units.find((u) => u.id === 'hero')).toMatchObject({ x: 0, y: 0 })
  })

  it('rejects move into occupied cell', () => {
    const s = battle({
      units: [
        unit({
          id: 'hero',
          side: 'player',
          x: 0,
          y: 0,
          hp: 10,
          maxHp: 10,
          unitLevel: 1,
        }),
        unit({
          id: 'e1',
          side: 'enemy',
          x: 1,
          y: 0,
          hp: 5,
          maxHp: 5,
          unitLevel: 1,
        }),
      ],
    })
    const next = applyAction(s, { type: 'move', unitId: 'hero', toX: 1, toY: 0 })
    expect(next).toBe(s)
  })

  it('accepts orthogonal move to empty cell', () => {
    const s = battle()
    const next = applyAction(s, { type: 'move', unitId: 'hero', toX: 1, toY: 0 })
    expect(next.units.find((u) => u.id === 'hero')).toMatchObject({ x: 1, y: 0 })
    expect(next.currentTurnIndex).toBe(1)
    expect(next.battleLog).toHaveLength(1)
    expect(next.battleLog[0]).toMatchObject({
      type: 'move',
      unitId: 'hero',
      fromX: 0,
      fromY: 0,
      toX: 1,
      toY: 0,
    })
  })
})

describe('applyAction attack', () => {
  it('melee only at distance 1', () => {
    const s = battle({
      units: [
        unit({
          id: 'hero',
          side: 'player',
          x: 0,
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
          hp: 5,
          maxHp: 5,
          unitLevel: 1,
        }),
      ],
    })
    const rejected = applyAction(s, {
      type: 'attack',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 1,
      kind: 'melee',
    })
    expect(rejected).toBe(s)

    const adjacent = battle({
      units: [
        unit({
          id: 'hero',
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
          hp: 5,
          maxHp: 5,
          unitLevel: 1,
        }),
      ],
      currentTurnIndex: 0,
      turnOrder: ['hero', 'e1'],
    })
    const hit = applyAction(adjacent, {
      type: 'attack',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 2,
      kind: 'melee',
    })
    expect(hit.units.find((u) => u.id === 'e1')?.hp).toBe(3)
    const last = hit.battleLog[hit.battleLog.length - 1]
    expect(last).toMatchObject({
      type: 'strike',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 2,
      attackKind: 'melee',
      targetKilled: false,
    })
  })

  it('ranged when manhattan in [1, maxRange] (no LOS MVP)', () => {
    const s = battle({
      units: [
        unit({
          id: 'hero',
          side: 'player',
          x: 0,
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
          hp: 5,
          maxHp: 5,
          unitLevel: 1,
        }),
      ],
    })
    const tooFar = applyAction(s, {
      type: 'attack',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 1,
      kind: 'ranged',
      maxRange: 1,
    })
    expect(tooFar).toBe(s)

    const ok = applyAction(s, {
      type: 'attack',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 1,
      kind: 'ranged',
      maxRange: 2,
    })
    expect(ok.units.find((u) => u.id === 'e1')?.hp).toBe(4)
  })
})

describe('battle end', () => {
  it('victory when no enemies left', () => {
    const s = battle({
      units: [
        unit({
          id: 'hero',
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
    })
    const end = applyAction(s, {
      type: 'attack',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 5,
      kind: 'melee',
    })
    expect(end.phase).toBe('victory')
  })

  it('defeat when hero has 0 HP', () => {
    const s = battle({
      units: [
        unit({
          id: 'hero',
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
      turnOrder: ['hero', 'e1'],
    })
    const end = applyAction(s, {
      type: 'attack',
      attackerId: 'e1',
      targetId: 'hero',
      damage: 5,
      kind: 'melee',
    })
    expect(end.phase).toBe('defeat')
  })
})

describe('applyAction heal', () => {
  it('heals ally up to maxHp and advances turn', () => {
    const s = battle({
      units: [
        unit({ id: 'hero', side: 'player', x: 0, y: 0, hp: 10, maxHp: 30, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 5, y: 0, hp: 5, maxHp: 5, unitLevel: 1 }),
      ],
    })
    const next = applyAction(s, {
      type: 'heal',
      healerId: 'hero',
      targetId: 'hero',
      amount: 6,
      fromCard: { cardId: 'c3', templateId: 'heal' },
    })
    expect(next.units.find((u) => u.id === 'hero')!.hp).toBe(16)
    expect(next.battleLog.at(-1)).toMatchObject({ type: 'heal', amount: 6 })
    expect(next.currentTurnIndex).toBe(1)
  })
})

describe('applyAction aoe_strike', () => {
  it('damages all units in 3x3 and advances turn once', () => {
    const s = battle({
      units: [
        unit({ id: 'hero', side: 'player', x: 2, y: 2, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 2, y: 1, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e2', side: 'enemy', x: 3, y: 2, hp: 10, maxHp: 10, unitLevel: 1 }),
      ],
    })
    const next = applyAction(s, {
      type: 'aoe_strike',
      attackerId: 'hero',
      centerX: 2,
      centerY: 2,
      damage: 8,
      aoeSize: 3,
    })
    expect(next.units.find((u) => u.id === 'e1')!.hp).toBe(2)
    expect(next.units.find((u) => u.id === 'e2')!.hp).toBe(2)
    expect(next.units.find((u) => u.id === 'hero')!.hp).toBe(2)
    expect(next.currentTurnIndex).toBe(1)
    const strikes = next.battleLog.filter((e) => e.type === 'strike')
    expect(strikes).toHaveLength(3)
    expect(next.battleLog.every((e) => e.type === 'strike' && e.attackKind === 'aoe')).toBe(true)
  })
})

describe('applyAction move multi-step', () => {
  it('accepts move within BFS range', () => {
    const s = battle({
      units: [
        unit({ id: 'hero', side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 4, y: 0, hp: 5, maxHp: 5, unitLevel: 1 }),
      ],
    })
    const next = applyAction(s, { type: 'move', unitId: 'hero', toX: 2, toY: 0 })
    expect(next.units.find((u) => u.id === 'hero')).toMatchObject({ x: 2, y: 0 })
  })
})
