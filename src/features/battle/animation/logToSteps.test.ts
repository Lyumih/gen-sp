import { describe, expect, it } from 'vitest'
import { mapLogEntryToSteps } from './logToSteps'
import type { BattleLogEntry, Unit } from '../../../game/types'

const units: Unit[] = [
  { id: 'hero', side: 'player', x: 1, y: 0, hp: 10, maxHp: 10, unitLevel: 1 },
  { id: 'e1', side: 'enemy', x: 3, y: 0, hp: 0, maxHp: 5, unitLevel: 1 },
]

const ctx = { units }

describe('mapLogEntryToSteps move', () => {
  it('maps short move to move step', () => {
    const entry: BattleLogEntry = {
      type: 'move',
      unitId: 'hero',
      fromX: 0,
      fromY: 0,
      toX: 1,
      toY: 0,
    }
    expect(mapLogEntryToSteps(entry, ctx)).toEqual([
      { kind: 'move', unitId: 'hero', from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
    ])
  })

  it('maps long move to teleport step', () => {
    const entry: BattleLogEntry = {
      type: 'move',
      unitId: 'hero',
      fromX: 0,
      fromY: 0,
      toX: 5,
      toY: 0,
    }
    expect(mapLogEntryToSteps(entry, ctx)[0]?.kind).toBe('teleport')
  })
})

describe('mapLogEntryToSteps strike', () => {
  it('maps zero damage to cast', () => {
    const entry: BattleLogEntry = {
      type: 'strike',
      attackerId: 'e1',
      targetId: 'hero',
      damage: 0,
      attackKind: 'ranged',
      targetKilled: false,
    }
    expect(mapLogEntryToSteps(entry, ctx)).toEqual([
      { kind: 'cast', casterId: 'e1', targetId: 'hero' },
    ])
  })

  it('maps melee with kill to strike_melee + death', () => {
    const entry: BattleLogEntry = {
      type: 'strike',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 5,
      attackKind: 'melee',
      targetKilled: true,
    }
    const steps = mapLogEntryToSteps(entry, ctx)
    expect(steps).toHaveLength(2)
    expect(steps[0]).toMatchObject({ kind: 'strike_melee', damage: 5 })
    expect(steps[1]).toMatchObject({ kind: 'death', unitId: 'e1', at: { x: 3, y: 0 } })
  })

  it('maps ranged to projectile', () => {
    const entry: BattleLogEntry = {
      type: 'strike',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 4,
      attackKind: 'ranged',
      targetKilled: false,
    }
    expect(mapLogEntryToSteps(entry, ctx)[0]?.kind).toBe('projectile')
  })

  it('maps aoe to aoe_burst at target cell', () => {
    const entry: BattleLogEntry = {
      type: 'strike',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 3,
      attackKind: 'aoe',
      targetKilled: false,
    }
    const step = mapLogEntryToSteps(entry, ctx)[0]
    expect(step).toMatchObject({
      kind: 'aoe_burst',
      center: { x: 3, y: 0 },
      cellKeys: ['3,0'],
    })
  })

  it('passes absorbedDamage on melee strike', () => {
    const entry: BattleLogEntry = {
      type: 'strike',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 3,
      absorbedDamage: 7,
      attackKind: 'melee',
      targetKilled: false,
    }
    expect(mapLogEntryToSteps(entry, ctx)[0]).toMatchObject({
      kind: 'strike_melee',
      damage: 3,
      absorbedDamage: 7,
    })
  })

  it('passes damage and absorbedDamage on aoe strike', () => {
    const entry: BattleLogEntry = {
      type: 'strike',
      attackerId: 'hero',
      targetId: 'e1',
      damage: 4,
      absorbedDamage: 2,
      attackKind: 'aoe',
      targetKilled: false,
    }
    expect(mapLogEntryToSteps(entry, ctx)[0]).toMatchObject({
      kind: 'aoe_burst',
      damage: 4,
      absorbedDamage: 2,
    })
  })
})

describe('mapLogEntryToSteps support', () => {
  it('maps heal', () => {
    const entry: BattleLogEntry = {
      type: 'heal',
      healerId: 'hero',
      targetId: 'hero',
      amount: 6,
    }
    expect(mapLogEntryToSteps(entry, ctx)[0]?.kind).toBe('heal')
  })

  it('maps resurrect', () => {
    const entry: BattleLogEntry = {
      type: 'resurrect',
      healerId: 'hero',
      targetId: 'e1',
      hp: 2,
    }
    expect(mapLogEntryToSteps(entry, ctx)[0]?.kind).toBe('resurrect')
  })

  it('maps status_applied to buff_aura', () => {
    const entry: BattleLogEntry = {
      type: 'status_applied',
      unitId: 'hero',
      statusKind: 'attack_up',
      sourceTemplateId: 'battle_cry',
    }
    expect(mapLogEntryToSteps(entry, ctx)[0]).toMatchObject({
      kind: 'buff_aura',
      statusKind: 'attack_up',
    })
  })

  it('maps divine_shield to holy buff', () => {
    const entry: BattleLogEntry = {
      type: 'status_applied',
      unitId: 'hero',
      statusKind: 'damage_reduction',
      sourceTemplateId: 'divine_shield',
    }
    expect(mapLogEntryToSteps(entry, ctx)[0]).toMatchObject({
      kind: 'buff_aura',
      holy: true,
    })
  })

  it('maps status_tick dot and regen', () => {
    expect(
      mapLogEntryToSteps({ type: 'status_tick', unitId: 'hero', dotDamage: 2 }, ctx)[0]?.kind,
    ).toBe('status_tick_dot')
    expect(
      mapLogEntryToSteps({ type: 'status_tick', unitId: 'hero', regenHeal: 3 }, ctx)[0]?.kind,
    ).toBe('status_tick_regen')
  })

  it('skips card_level_up', () => {
    const entry: BattleLogEntry = {
      type: 'card_level_up',
      cardId: 'c1',
      templateId: 'strike',
      fromLevel: 1,
      toLevel: 2,
      roll: 42,
    }
    expect(mapLogEntryToSteps(entry, ctx)).toEqual([])
  })
})
