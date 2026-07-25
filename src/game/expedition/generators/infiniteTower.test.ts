import { describe, expect, it } from 'vitest'
import { generateInfiniteTower } from './infiniteTower'

describe('generateInfiniteTower', () => {
  it('is deterministic for same seed and floor', () => {
    const a = generateInfiniteTower({ runSeed: 123, floor: 5 })
    const b = generateInfiniteTower({ runSeed: 123, floor: 5 })
    expect(a.enemySpawns).toEqual(b.enemySpawns)
    expect(a.towerAffixId).toBe(b.towerAffixId)
  })

  it('floor 1 has one enemy spawn', () => {
    const s = generateInfiniteTower({ runSeed: 1, floor: 1 })
    expect(s.enemySpawns.length).toBe(1)
    expect(s.width).toBeLessThanOrEqual(8)
  })

  it('floor 5 has four grunts and one boss', () => {
    const s = generateInfiniteTower({ runSeed: 99, floor: 5 })
    expect(s.enemySpawns.length).toBe(5)
  })
})
