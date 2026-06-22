import { describe, expect, it } from 'vitest'
import { BASE_STAT_BOUNDS, BASE_STAT_IDS } from '../config/baseStats'
import type { BaseStats } from '../config/baseStats'
import { computeBaseStatRating, formatBaseStatRatingPercent, statQuality } from './computeRating'

describe('computeBaseStatRating', () => {
  it('statQuality for initiative 12 vs cap 10 is 1.2', () => {
    expect(statQuality(12, 10)).toBe(1.2)
  })

  it('all mins yields low rating', () => {
    const stats = {} as BaseStats
    for (const id of BASE_STAT_IDS) stats[id] = BASE_STAT_BOUNDS[id].min
    expect(computeBaseStatRating(stats)).toBeLessThan(0.2)
  })

  it('format as percent rounds', () => {
    expect(formatBaseStatRatingPercent(0.784)).toBe('78%')
  })
})
