import { describe, expect, it } from 'vitest'
import { LEGACY_HERO_CHARACTER_ID } from '../character/constants'
import type { BattleState, PassiveEquipLoadout, Unit } from '../types'
import { createPassiveInstance } from './passiveFactory'
import { applyPassiveProgress } from './passiveProgress'
import { firePassives } from './passiveEngine'

const HERO_ID = LEGACY_HERO_CHARACTER_ID

function unit(partial: Unit): Unit {
  return partial
}

function battle(overrides: Partial<BattleState> = {}): BattleState {
  return {
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
    ],
    turnOrder: [HERO_ID],
    currentTurnIndex: 0,
    roundNumber: 1,
    phase: 'ongoing',
    worldPower: 0,
    playerCardsByUnitId: {},
    battleLog: [],
    ...overrides,
  }
}

function equip(ids: readonly string[]): PassiveEquipLoadout {
  const loadout: PassiveEquipLoadout = [null, null, null, null]
  ids.forEach((id, i) => {
    if (i < 4) loadout[i] = id
  })
  return loadout
}

describe('applyPassiveProgress', () => {
  it('increments uses_count and can level up', () => {
    const passive = createPassiveInstance('warrior_fortitude')
    const next = applyPassiveProgress(passive, 100)
    expect(next.uses_count).toBe(1)
    expect(next.leveledUp).toBe(true)
    expect(next.global_level).toBe(2)
    expect(next.effectTriggered).toBe(true)
  })
})

describe('firePassives', () => {
  it('levels stat_flat passive on matching trigger', () => {
    const fortitude = createPassiveInstance('warrior_fortitude')
    const actor = unit({
      id: HERO_ID,
      side: 'player',
      x: 0,
      y: 0,
      hp: 8,
      maxHp: 10,
      unitLevel: 1,
    })
    const result = firePassives({
      trigger: 'on_damaged',
      passives: [fortitude],
      passiveEquip: equip([fortitude.id]),
      actor,
      battle: battle(),
      rng: () => 0.5,
      randomInt1to100: () => 100,
      damageDealt: 2,
      attackerId: 'e1',
      phase: 'post_damage',
    })
    expect(result.passives[0]!.global_level).toBe(2)
    expect(result.combatPatches).toHaveLength(0)
  })

  it('does not level proc passive when roll fails', () => {
    const riposte = createPassiveInstance('warrior_riposte')
    const actor = unit({
      id: HERO_ID,
      side: 'player',
      x: 1,
      y: 0,
      hp: 8,
      maxHp: 10,
      unitLevel: 1,
    })
    const result = firePassives({
      trigger: 'on_damaged',
      passives: [riposte],
      passiveEquip: equip([riposte.id]),
      actor,
      battle: battle({
        units: [
          actor,
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
      }),
      rng: () => 0.99,
      randomInt1to100: () => 1,
      damageDealt: 2,
      attackerId: 'e1',
      phase: 'post_damage',
    })
    expect(result.passives[0]!.uses_count).toBe(0)
    expect(result.log).toHaveLength(0)
    expect(result.combatPatches).toHaveLength(0)
  })

  it('warrior_battle_line proc without procChance always triggers with allies nearby', () => {
    const battleLine = createPassiveInstance('warrior_battle_line')
    const allyId = 'ally-1'
    const actor = unit({
      id: HERO_ID,
      side: 'player',
      x: 0,
      y: 0,
      hp: 10,
      maxHp: 10,
      unitLevel: 1,
    })
    const result = firePassives({
      trigger: 'on_turn_start',
      passives: [battleLine],
      passiveEquip: equip([battleLine.id]),
      actor,
      battle: battle({
        units: [
          actor,
          unit({
            id: allyId,
            side: 'player',
            x: 1,
            y: 0,
            hp: 10,
            maxHp: 10,
            unitLevel: 1,
          }),
        ],
      }),
      rng: () => 0.99,
      randomInt1to100: () => 1,
    })
    expect(result.passives[0]!.uses_count).toBe(1)
    expect(result.combatPatches).toEqual([
      expect.objectContaining({ kind: 'defense_add', unitId: HERO_ID, amount: 1 }),
    ])
  })

  it('healer_renewal proc without procChance triggers on regen tick', () => {
    const renewal = createPassiveInstance('healer_renewal')
    const actor = unit({
      id: HERO_ID,
      side: 'player',
      x: 0,
      y: 0,
      hp: 8,
      maxHp: 10,
      unitLevel: 1,
    })
    const result = firePassives({
      trigger: 'on_regen_tick',
      passives: [renewal],
      passiveEquip: equip([renewal.id]),
      actor,
      battle: battle(),
      rng: () => 0.99,
      randomInt1to100: () => 1,
      regenHeal: 3,
    })
    expect(result.passives[0]!.uses_count).toBe(1)
    expect(result.combatPatches.some((p) => p.kind === 'regen_bonus')).toBe(true)
  })

  it('levels proc passive only on successful proc', () => {
    const riposte = createPassiveInstance('warrior_riposte')
    const actor = unit({
      id: HERO_ID,
      side: 'player',
      x: 1,
      y: 0,
      hp: 8,
      maxHp: 10,
      unitLevel: 1,
    })
    const result = firePassives({
      trigger: 'on_damaged',
      passives: [riposte],
      passiveEquip: equip([riposte.id]),
      actor,
      battle: battle({
        units: [
          actor,
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
      }),
      rng: () => 0.01,
      randomInt1to100: () => 100,
      damageDealt: 2,
      attackerId: 'e1',
      phase: 'post_damage',
    })
    expect(result.passives[0]!.uses_count).toBe(1)
    expect(result.log.some((e) => e.type === 'passive_proc')).toBe(true)
    expect(result.combatPatches.some((p) => p.kind === 'counter_strike')).toBe(true)
  })
})
