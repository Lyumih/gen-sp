import { describe, expect, it } from 'vitest'
import {
  BASE_STAT_BOUNDS,
  BASE_STAT_IDS,
  CLASS_MANA_REGEN_ROLL_MAX,
  CLASS_MANA_ROLL_MAX,
  CLASS_STAT_AFFINITY,
  getStatAffinity,
} from './baseStats'

describe('baseStats config', () => {
  it('has manaRegen as 10th stat', () => {
    expect(BASE_STAT_IDS).toContain('manaRegen')
    expect(BASE_STAT_IDS).toHaveLength(10)
  })

  it('warrior mana roll max is at least 15', () => {
    expect(CLASS_MANA_ROLL_MAX.warrior).toBeGreaterThanOrEqual(15)
    expect(CLASS_MANA_ROLL_MAX.berserker).toBeGreaterThanOrEqual(15)
  })

  it('mage has highest mana pool roll max', () => {
    expect(CLASS_MANA_ROLL_MAX.mage).toBe(35)
    expect(CLASS_MANA_REGEN_ROLL_MAX.mage).toBe(8)
  })

  it('warrior has health and defense as primary', () => {
    expect(CLASS_STAT_AFFINITY.warrior.primary).toEqual(['health', 'defense'])
    expect(getStatAffinity('warrior', 'health')).toBe('primary')
    expect(getStatAffinity('warrior', 'attack')).toBe('secondary')
    expect(getStatAffinity('warrior', 'mana')).toBe('normal')
  })

  it('health bounds are 1..30', () => {
    expect(BASE_STAT_BOUNDS.health).toEqual({ min: 1, max: 30 })
  })
})
