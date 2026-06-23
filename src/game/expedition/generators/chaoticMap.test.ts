import { describe, expect, it } from 'vitest'
import { generateChaoticMap } from './chaoticMap'

describe('generateChaoticMap', () => {
  it('is deterministic and within bounds', () => {
    const a = generateChaoticMap({ seed: 5, battleIndex: 0, expeditionPartySize: 3 })
    const b = generateChaoticMap({ seed: 5, battleIndex: 0, expeditionPartySize: 3 })
    expect(a).toEqual(b)
    expect(a.width).toBeGreaterThanOrEqual(1)
    expect(a.height).toBeGreaterThanOrEqual(1)
    expect(a.width * a.height).toBeGreaterThan(1)
  })
})
