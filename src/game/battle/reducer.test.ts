import { describe, expect, it } from 'vitest'
import { LEGACY_HERO_CHARACTER_ID } from '../character/constants'
import type { BattleModContext, BattleState, ModSlotState, Unit } from '../types'
import { createPassiveInstance } from '../passives/passiveFactory'
import { cellKey, manhattan, orthoNeighbors } from './grid'
import { TEST_BASE_STATS } from '../stats/testFixtures'
import { appendUnitStatus, statusForSkill } from './unitStatus'
import { tickHeroCardCooldowns } from './cardCooldown'
import { applyAction, advanceBattleTurn } from './reducer'

const HERO_ID = LEGACY_HERO_CHARACTER_ID

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
        id: HERO_ID,
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
    const next = applyAction(s, { type: 'move', unitId: HERO_ID, toX: 1, toY: 0 })
    expect(next).toBe(s)
    expect(next.units.find((u) => u.id === HERO_ID)).toMatchObject({ x: 0, y: 0 })
  })

  it('rejects move into occupied cell', () => {
    const s = battle({
      units: [
        unit({
          id: HERO_ID,
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
    const next = applyAction(s, { type: 'move', unitId: HERO_ID, toX: 1, toY: 0 })
    expect(next).toBe(s)
  })

  it('accepts orthogonal move to empty cell', () => {
    const s = battle()
    const next = applyAction(s, { type: 'move', unitId: HERO_ID, toX: 1, toY: 0 })
    expect(next.units.find((u) => u.id === HERO_ID)).toMatchObject({ x: 1, y: 0 })
    expect(next.currentTurnIndex).toBe(1)
    expect(next.battleLog).toHaveLength(1)
    expect(next.battleLog[0]).toMatchObject({
      type: 'move',
      unitId: HERO_ID,
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
          id: HERO_ID,
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
      attackerId: HERO_ID,
      targetId: 'e1',
      damage: 1,
      kind: 'melee',
    })
    expect(rejected).toBe(s)

    const adjacent = battle({
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
          hp: 5,
          maxHp: 5,
          unitLevel: 1,
        }),
      ],
      currentTurnIndex: 0,
      turnOrder: [HERO_ID, 'e1'],
    })
    const hit = applyAction(adjacent, {
      type: 'attack',
      attackerId: HERO_ID,
      targetId: 'e1',
      damage: 2,
      kind: 'melee',
    })
    expect(hit.units.find((u) => u.id === 'e1')?.hp).toBe(3)
    const last = hit.battleLog[hit.battleLog.length - 1]
    expect(last).toMatchObject({
      type: 'strike',
      attackerId: HERO_ID,
      targetId: 'e1',
      damage: 2,
      attackKind: 'melee',
      targetKilled: false,
    })
  })

  it('strike log includes absorbedDamage when target mitigates', () => {
    const s = battle({
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
          hp: 30,
          maxHp: 30,
          unitLevel: 1,
          baseStats: TEST_BASE_STATS,
          statusEffects: [
            {
              id: 'def-up',
              kind: 'defense_up',
              remainingTurns: 2,
              magnitude: 5,
            },
          ],
        }),
      ],
      currentTurnIndex: 0,
      turnOrder: [HERO_ID, 'e1'],
    })
    const hit = applyAction(s, {
      type: 'attack',
      attackerId: HERO_ID,
      targetId: 'e1',
      damage: 10,
      kind: 'melee',
    })
    const last = hit.battleLog[hit.battleLog.length - 1]
    expect(last).toMatchObject({
      type: 'strike',
      damage: 5,
      absorbedDamage: 5,
    })
    expect((last as { absorbedDamage?: number }).absorbedDamage).toBeGreaterThan(0)
  })

  it('strike log omits absorbedDamage when zero', () => {
    const adjacent = battle({
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
          hp: 5,
          maxHp: 5,
          unitLevel: 1,
        }),
      ],
      currentTurnIndex: 0,
      turnOrder: [HERO_ID, 'e1'],
    })
    const hit = applyAction(adjacent, {
      type: 'attack',
      attackerId: HERO_ID,
      targetId: 'e1',
      damage: 2,
      kind: 'melee',
    })
    const last = hit.battleLog[hit.battleLog.length - 1]
    expect(last).toMatchObject({ type: 'strike', damage: 2 })
    expect((last as { absorbedDamage?: number }).absorbedDamage).toBeUndefined()
  })

  it('ranged when manhattan in [1, maxRange] (no LOS MVP)', () => {
    const s = battle({
      units: [
        unit({
          id: HERO_ID,
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
      attackerId: HERO_ID,
      targetId: 'e1',
      damage: 1,
      kind: 'ranged',
      maxRange: 1,
    })
    expect(tooFar).toBe(s)

    const ok = applyAction(s, {
      type: 'attack',
      attackerId: HERO_ID,
      targetId: 'e1',
      damage: 1,
      kind: 'ranged',
      maxRange: 2,
    })
    expect(ok.units.find((u) => u.id === 'e1')?.hp).toBe(4)
    expect(ok.heroRangedCooldownByUnitId?.[HERO_ID]).toBe(1)
  })

  it('basic ranged sets 1-turn cooldown and blocks repeat until ticked', () => {
    const s = battle({
      units: [
        unit({
          id: HERO_ID,
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
          hp: 20,
          maxHp: 20,
          unitLevel: 1,
        }),
      ],
    })
    const afterShot = applyAction(s, {
      type: 'attack',
      attackerId: HERO_ID,
      targetId: 'e1',
      damage: 1,
      kind: 'ranged',
      maxRange: 2,
    })
    expect(afterShot.heroRangedCooldownByUnitId?.[HERO_ID]).toBe(1)

    const blocked = applyAction(afterShot, {
      type: 'attack',
      attackerId: HERO_ID,
      targetId: 'e1',
      damage: 1,
      kind: 'ranged',
      maxRange: 2,
    })
    expect(blocked).toBe(afterShot)

    const afterEndOfShotTurn = tickHeroCardCooldowns(afterShot, HERO_ID)
    expect(afterEndOfShotTurn.heroRangedCooldownByUnitId?.[HERO_ID]).toBe(1)

    const afterNextHeroTurn = tickHeroCardCooldowns(afterEndOfShotTurn, HERO_ID)
    expect(afterNextHeroTurn.heroRangedCooldownByUnitId?.[HERO_ID]).toBeUndefined()

    const heroTurn = { ...afterNextHeroTurn, currentTurnIndex: 0 }
    const secondShot = applyAction(heroTurn, {
      type: 'attack',
      attackerId: HERO_ID,
      targetId: 'e1',
      damage: 1,
      kind: 'ranged',
      maxRange: 2,
    })
    expect(secondShot.units.find((u) => u.id === 'e1')?.hp).toBe(18)
  })
})

describe('battle end', () => {
  it('victory when no enemies left', () => {
    const s = battle({
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
    })
    const end = applyAction(s, {
      type: 'attack',
      attackerId: HERO_ID,
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
  })
})

describe('applyAction heal', () => {
  it('heals ally up to maxHp and advances turn', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 10, maxHp: 30, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 5, y: 0, hp: 5, maxHp: 5, unitLevel: 1 }),
      ],
    })
    const next = applyAction(s, {
      type: 'heal',
      healerId: HERO_ID,
      targetId: HERO_ID,
      amount: 6,
      fromCard: { cardId: 'c3', templateId: 'heal' },
    })
    expect(next.units.find((u) => u.id === HERO_ID)!.hp).toBe(16)
    expect(next.battleLog.at(-1)).toMatchObject({ type: 'heal', amount: 6 })
    expect(next.currentTurnIndex).toBe(1)
  })
})

describe('applyAction aoe_strike', () => {
  it('damages all units in 3x3 and advances turn once', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 2, y: 2, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 2, y: 1, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e2', side: 'enemy', x: 3, y: 2, hp: 10, maxHp: 10, unitLevel: 1 }),
      ],
    })
    const next = applyAction(s, {
      type: 'aoe_strike',
      attackerId: HERO_ID,
      centerX: 2,
      centerY: 2,
      damage: 8,
      aoeSize: 3,
    })
    expect(next.units.find((u) => u.id === 'e1')!.hp).toBe(2)
    expect(next.units.find((u) => u.id === 'e2')!.hp).toBe(2)
    expect(next.units.find((u) => u.id === HERO_ID)!.hp).toBe(2)
    expect(next.currentTurnIndex).toBe(1)
    const strikes = next.battleLog.filter((e) => e.type === 'strike')
    expect(strikes).toHaveLength(3)
    expect(next.battleLog.every((e) => e.type === 'strike' && e.attackKind === 'aoe')).toBe(true)
  })
})

describe('applyAction turn order / initiative', () => {
  it('starts round 2 with rebuilt initiative order after full round', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1, initiativeBase: 8 }),
        unit({ id: 'e1', side: 'enemy', x: 3, y: 0, hp: 5, maxHp: 5, unitLevel: 1, initiativeBase: 12 }),
      ],
      turnOrder: [HERO_ID, 'e1'],
      currentTurnIndex: 0,
      roundNumber: 1,
    })
    const afterHero = applyAction(s, { type: 'move', unitId: HERO_ID, toX: 1, toY: 0 })
    expect(afterHero.roundNumber).toBe(1)
    expect(afterHero.currentTurnIndex).toBe(1)

    const afterEnemy = applyAction(afterHero, { type: 'move', unitId: 'e1', toX: 2, toY: 0 })
    expect(afterEnemy.roundNumber).toBe(2)
    expect(afterEnemy.turnOrder).toEqual(['e1', HERO_ID])
    expect(afterEnemy.currentTurnIndex).toBe(0)
  })
})

describe('applyAction move multi-step', () => {
  it('accepts move within BFS range', () => {
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 4, y: 0, hp: 5, maxHp: 5, unitLevel: 1 }),
      ],
    })
    const next = applyAction(s, { type: 'move', unitId: HERO_ID, toX: 2, toY: 0 })
    expect(next.units.find((u) => u.id === HERO_ID)).toMatchObject({ x: 2, y: 0 })
  })
})

function modCtx(slots: ModSlotState[], rng: () => number): BattleModContext {
  return { modSlots: slots, rng }
}

describe('applyAction passive procs', () => {
  it('on_damaged riposte proc adds passive_proc log entry', () => {
    const riposte = createPassiveInstance('warrior_riposte')
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 1, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 2, y: 0, hp: 20, maxHp: 20, unitLevel: 1 }),
      ],
      currentTurnIndex: 1,
      turnOrder: [HERO_ID, 'e1'],
      passivesByUnitId: { [HERO_ID]: [riposte] },
      passiveRng: () => 0.01,
    })
    const next = applyAction(s, {
      type: 'attack',
      attackerId: 'e1',
      targetId: HERO_ID,
      damage: 2,
      kind: 'melee',
    })
    expect(next.battleLog.some((e) => e.type === 'passive_proc' && e.templateId === 'warrior_riposte')).toBe(
      true,
    )
    expect(next.units.find((u) => u.id === 'e1')!.hp).toBeLessThan(20)
  })

  it('rogue_smoke_veil dodges damage on successful proc', () => {
    const smoke = createPassiveInstance('rogue_smoke_veil')
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 1, y: 0, hp: 8, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 2, y: 0, hp: 20, maxHp: 20, unitLevel: 1 }),
      ],
      currentTurnIndex: 1,
      turnOrder: [HERO_ID, 'e1'],
      passivesByUnitId: { [HERO_ID]: [smoke] },
      passiveRng: () => 0.01,
    })
    const next = applyAction(s, {
      type: 'attack',
      attackerId: 'e1',
      targetId: HERO_ID,
      damage: 2,
      kind: 'melee',
    })
    expect(next.units.find((u) => u.id === HERO_ID)!.hp).toBe(8)
    expect(
      next.battleLog.some((e) => e.type === 'passive_proc' && e.templateId === 'rogue_smoke_veil'),
    ).toBe(true)
  })

  it('berserker_rage increases outgoing strike damage', () => {
    const rage = createPassiveInstance('berserker_rage')
    const baseUnits = [
      unit({
        id: HERO_ID,
        side: 'player',
        x: 1,
        y: 0,
        hp: 10,
        maxHp: 10,
        unitLevel: 1,
        baseStats: TEST_BASE_STATS,
      }),
      unit({ id: 'e1', side: 'enemy', x: 2, y: 0, hp: 30, maxHp: 30, unitLevel: 1 }),
    ]
    const without = applyAction(
      battle({ units: baseUnits, passiveRng: () => 1 }),
      { type: 'attack', attackerId: HERO_ID, targetId: 'e1', damage: 5, kind: 'melee' },
    )
    const withRage = applyAction(
      battle({
        units: baseUnits,
        passivesByUnitId: { [HERO_ID]: [rage] },
        passiveRng: () => 1,
      }),
      { type: 'attack', attackerId: HERO_ID, targetId: 'e1', damage: 5, kind: 'melee' },
    )
    expect(withRage.units.find((u) => u.id === 'e1')!.hp).toBeLessThan(
      without.units.find((u) => u.id === 'e1')!.hp,
    )
  })

  it('advanceBattleTurn fires warrior_battle_line on player turn start', () => {
    const battleLine = createPassiveInstance('warrior_battle_line')
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'ally', side: 'player', x: 1, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 3, y: 0, hp: 5, maxHp: 5, unitLevel: 1 }),
      ],
      currentTurnIndex: 0,
      turnOrder: ['e1', HERO_ID],
      passivesByUnitId: { [HERO_ID]: [battleLine] },
    })
    const next = advanceBattleTurn(s)
    expect(
      next.battleLog.some((e) => e.type === 'passive_proc' && e.templateId === 'warrior_battle_line'),
    ).toBe(true)
  })

  it('advanceBattleTurn fires healer_renewal on regen tick', () => {
    const renewal = createPassiveInstance('healer_renewal')
    const regenStatus = statusForSkill('regeneration', 6)
    let hero = unit({ id: HERO_ID, side: 'player', x: 0, y: 0, hp: 5, maxHp: 10, unitLevel: 1 })
    if (regenStatus) hero = appendUnitStatus(hero, regenStatus)
    const s = battle({
      units: [
        hero,
        unit({ id: 'e1', side: 'enemy', x: 2, y: 0, hp: 5, maxHp: 5, unitLevel: 1 }),
      ],
      currentTurnIndex: 0,
      turnOrder: ['e1', HERO_ID],
      passivesByUnitId: { [HERO_ID]: [renewal] },
    })
    const next = advanceBattleTurn(s)
    expect(
      next.battleLog.some((e) => e.type === 'passive_proc' && e.templateId === 'healer_renewal'),
    ).toBe(true)
  })
})

describe('applyAction mod procs', () => {
  it('reflects thorns damage when player takes a hit', () => {
    const thorns: ModSlotState[] = [{ status: 'filled', templateId: 'mod-thorns', lm: 0 }]
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 1, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 2, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
      ],
      currentTurnIndex: 1,
      turnOrder: [HERO_ID, 'e1'],
      playerGearModSlotsByUnitId: { [HERO_ID]: thorns },
    })
    const next = applyAction(s, {
      type: 'attack',
      attackerId: 'e1',
      targetId: HERO_ID,
      damage: 2,
      kind: 'melee',
    })
    expect(next.units.find((u) => u.id === HERO_ID)!.hp).toBe(8)
    expect(next.units.find((u) => u.id === 'e1')!.hp).toBe(7)
    expect(next.battleLog.some((e) => e.type === 'mod_proc' && e.modTemplateId === 'mod-thorns')).toBe(true)
  })

  it('proc_extra_hit deals extra damage with mod_proc log', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-double-strike', lm: 0 }]
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 1, y: 0, hp: 10, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 2, y: 0, hp: 20, maxHp: 20, unitLevel: 1 }),
      ],
    })
    const next = applyAction(s, {
      type: 'attack',
      attackerId: HERO_ID,
      targetId: 'e1',
      damage: 5,
      kind: 'melee',
      modCtx: modCtx(slots, () => 20),
    })
    expect(next.units.find((u) => u.id === 'e1')!.hp).toBe(10)
    expect(next.battleLog.filter((e) => e.type === 'strike')).toHaveLength(2)
    expect(next.battleLog.some((e) => e.type === 'mod_proc' && e.modTemplateId === 'mod-double-strike')).toBe(
      true,
    )
  })

  it('lifesteal heals attacker after damage', () => {
    const slots: ModSlotState[] = [{ status: 'filled', templateId: 'mod-lifesteal', lm: 0 }]
    const s = battle({
      units: [
        unit({ id: HERO_ID, side: 'player', x: 1, y: 0, hp: 8, maxHp: 10, unitLevel: 1 }),
        unit({ id: 'e1', side: 'enemy', x: 2, y: 0, hp: 20, maxHp: 20, unitLevel: 1 }),
      ],
    })
    const next = applyAction(s, {
      type: 'attack',
      attackerId: HERO_ID,
      targetId: 'e1',
      damage: 10,
      kind: 'melee',
      modCtx: modCtx(slots, () => 99),
    })
    expect(next.units.find((u) => u.id === HERO_ID)!.hp).toBe(10)
    expect(next.battleLog.some((e) => e.type === 'mod_proc' && e.modTemplateId === 'mod-lifesteal')).toBe(true)
  })
})

describe('applyAction enemy card_attack', () => {
  it('enemy fireball card_attack deals aoe damage and sets cooldown', () => {
    const s = battle({
      width: 6,
      height: 4,
      units: [
        unit({
          id: HERO_ID,
          side: 'player',
          x: 2,
          y: 0,
          hp: 20,
          maxHp: 20,
          unitLevel: 1,
        }),
        unit({
          id: 'e1',
          side: 'enemy',
          x: 0,
          y: 0,
          hp: 10,
          maxHp: 10,
          unitLevel: 1,
          baseStats: {
            health: 10,
            defense: 1,
            attack: 2,
            magicPower: 5,
            mana: 0,
            healPower: 0,
            speed: 2,
            initiative: 6,
            critChance: 2,
          },
        }),
      ],
      turnOrder: ['e1', HERO_ID],
      currentTurnIndex: 0,
      enemyCardsByUnitId: {
        e1: [
          {
            id: 'fb',
            templateId: 'fireball',
            global_level: 5,
            uses_count: 0,
            modSlots: [],
            cooldownRemaining: 0,
          },
        ],
      },
    })
    const next = applyAction(s, {
      type: 'card_attack',
      attackerId: 'e1',
      cardId: 'fb',
      targetX: 2,
      targetY: 0,
    })
    expect(next.units.find((u) => u.id === HERO_ID)!.hp).toBeLessThan(20)
    expect(next.enemyCardsByUnitId?.e1?.[0]?.cooldownRemaining).toBe(6)
    expect(next.battleLog.some((e) => e.type === 'strike' && e.fromCard?.templateId === 'fireball')).toBe(
      true,
    )
    expect(next.currentTurnIndex).toBe(1)
  })
})
