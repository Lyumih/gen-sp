import { describe, expect, it } from 'vitest'
import {
  BASE_STAT_BOUNDS,
  BASE_STAT_IDS,
  CLASS_STAT_AFFINITY,
  getStatAffinity,
} from './baseStats'

describe('baseStats config', () => {
  it('has 9 stats in display order', () => {
    expect(BASE_STAT_IDS).toHaveLength(9)
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
