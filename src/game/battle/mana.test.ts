import { describe, expect, it } from 'vitest'
import { TEST_BASE_STATS } from '../stats/testFixtures'
import type { Unit } from '../types'
import {
  canAffordManaCost,
  effectiveManaCostForTemplate,
  regenManaAtTurnStart,
  spendMana,
  unitManaFromBaseStats,
} from './mana'

const unit = (overrides: Partial<Unit>): Unit => ({
  id: 'u1',
  side: 'player',
  x: 0,
  y: 0,
  hp: 10,
  maxHp: 10,
  unitLevel: 1,
  mana: 20,
  maxMana: 30,
  baseStats: { ...TEST_BASE_STATS, mana: 30, manaRegen: 4 },
  ...overrides,
})

describe('unitManaFromBaseStats', () => {
  it('starts full at max pool', () => {
    expect(unitManaFromBaseStats({ ...TEST_BASE_STATS, mana: 25, manaRegen: 3 })).toEqual({
      mana: 25,
      maxMana: 25,
    })
  })
})

describe('regenManaAtTurnStart', () => {
  it('adds manaRegen capped at maxMana', () => {
    const u = unit({ mana: 28 })
    expect(regenManaAtTurnStart(u).mana).toBe(30)
  })

  it('no-op when manaRegen is 0', () => {
    const u = unit({ baseStats: { ...TEST_BASE_STATS, manaRegen: 0 }, mana: 10 })
    expect(regenManaAtTurnStart(u).mana).toBe(10)
  })
})

describe('spendMana', () => {
  it('subtracts cost', () => {
    expect(spendMana(unit({ mana: 20 }), 12).mana).toBe(8)
  })
})

describe('canAffordManaCost', () => {
  it('false when insufficient', () => {
    expect(canAffordManaCost(unit({ mana: 5 }), 10)).toBe(false)
  })
})

describe('effectiveManaCostForTemplate', () => {
  it('returns the modded template mana cost', () => {
    expect(
      effectiveManaCostForTemplate('strike', {
        carrierTags: ['skill'],
        modSlots: [],
        rng: () => 50,
      }),
    ).toBe(9)
  })

  it('returns null for an unknown template', () => {
    expect(
      effectiveManaCostForTemplate('missing', {
        carrierTags: [],
        modSlots: [],
        rng: () => 50,
      }),
    ).toBeNull()
  })
})
