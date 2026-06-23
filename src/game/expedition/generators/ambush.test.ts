import { describe, expect, it } from 'vitest'
import { generateAmbush } from './ambush'
import { enemySpawnCount } from '../../campaign/scenarios'

describe('generateAmbush', () => {
  it('is 10x10 with up to 8 enemies', () => {
    const s = generateAmbush({ seed: 99, battleIndex: 0, expeditionPartySize: 4 })
    expect(s.width).toBe(10)
    expect(s.height).toBe(10)
    expect(enemySpawnCount(s)).toBeLessThanOrEqual(8)
    expect(s.playerSpawnZone).toBeDefined()
  })
})
