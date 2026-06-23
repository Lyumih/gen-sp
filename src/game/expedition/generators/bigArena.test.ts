import { describe, expect, it } from 'vitest'
import { enemySpawnCount } from '../../campaign/scenarios'
import { generateBigArena } from './bigArena'

describe('generateBigArena', () => {
  it('is 10x20 with 9–15 enemies', () => {
    const s = generateBigArena({ seed: 42, battleIndex: 0, expeditionPartySize: 4 })
    expect(s.width).toBe(10)
    expect(s.height).toBe(20)
    const count = enemySpawnCount(s)
    expect(count).toBeGreaterThanOrEqual(9)
    expect(count).toBeLessThanOrEqual(15)
    expect(s.playerSpawnZone).toEqual({ xMin: 0, xMax: 3, yMin: 0, yMax: 19 })
  })
})
