import { describe, expect, it } from 'vitest'
import { generateSmallSkirmish } from './smallSkirmish'
import { enemySpawnCount } from '../../campaign/scenarios'

describe('generateSmallSkirmish', () => {
  it('builds 1x2 or 2x1 field with one enemy', () => {
    const s = generateSmallSkirmish({ seed: 7, battleIndex: 0, expeditionPartySize: 1 })
    expect(s.width * s.height).toBe(2)
    expect(s.playerSpawns).toHaveLength(1)
    expect(enemySpawnCount(s)).toBe(1)
  })
})
