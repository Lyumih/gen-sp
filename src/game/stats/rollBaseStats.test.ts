import { describe, expect, it } from 'vitest'
import { seededRng } from '../tavern/generateCandidates'
import {
  hashSeed,
  rollBaseStatsForClass,
  rollClassManaStats,
  rollClassManaStatsDeterministic,
  rollStatInRange,
  rollUpperBound,
} from './rollBaseStats'

describe('rollUpperBound', () => {
  it('primary extends to max*1.5', () => {
    expect(rollUpperBound(30, 'primary')).toBe(45)
    expect(rollUpperBound(5, 'secondary')).toBe(6)
    expect(rollUpperBound(10, 'normal')).toBe(10)
  })
})

describe('rollStatInRange', () => {
  it('returns min when rng is 0', () => {
    expect(rollStatInRange(1, 45, () => 0)).toBe(1)
  })
})

describe('rollBaseStatsForClass', () => {
  it('warrior health can exceed config max', () => {
    const stats = rollBaseStatsForClass('warrior', () => 0.99)
    expect(stats.health).toBeGreaterThan(30)
  })

  it('is deterministic for same rng sequence', () => {
    const a = rollBaseStatsForClass('mage', seededRng(42))
    const b = rollBaseStatsForClass('mage', seededRng(42))
    expect(a).toEqual(b)
  })
})

describe('hashSeed', () => {
  it('is stable for same input', () => {
    expect(hashSeed('c1:warrior')).toBe(hashSeed('c1:warrior'))
  })
})

describe('rollClassManaStats', () => {
  it('mage mana is within 0..35', () => {
    for (let i = 0; i < 20; i++) {
      const { mana, manaRegen } = rollClassManaStats('mage', Math.random)
      expect(mana).toBeGreaterThanOrEqual(0)
      expect(mana).toBeLessThanOrEqual(35)
      expect(manaRegen).toBeLessThanOrEqual(8)
    }
  })

  it('deterministic roll is stable', () => {
    const a = rollClassManaStatsDeterministic('healer', 'char-1')
    const b = rollClassManaStatsDeterministic('healer', 'char-1')
    expect(a).toEqual(b)
  })
})

describe('rollBaseStatsForClass mana', () => {
  it('uses class table not affinity extended range for mana', () => {
    const stats = rollBaseStatsForClass('mage', () => 0.99)
    expect(stats.mana).toBeLessThanOrEqual(35)
    expect(stats.manaRegen).toBeLessThanOrEqual(8)
  })
})
