import { describe, expect, it } from 'vitest'
import {
  EXPEDITION_CHAINS,
  resolveBattleCount,
  resolvePartySize,
} from './config'

describe('resolvePartySize', () => {
  it('returns fixed party size', () => {
    expect(resolvePartySize(4, () => 0)).toBe(4)
  })

  it('rolls in range via floor(min + rng * (max - min + 1))', () => {
    expect(resolvePartySize({ min: 2, max: 5 }, () => 0.5)).toBe(4)
    expect(resolvePartySize({ min: 2, max: 5 }, () => 0)).toBe(2)
    expect(resolvePartySize({ min: 2, max: 5 }, () => 0.999)).toBe(5)
  })
})

describe('resolveBattleCount', () => {
  it('returns fixed battle count', () => {
    expect(resolveBattleCount(3, () => 0)).toBe(3)
  })

  it('rolls in range with the same formula as party size', () => {
    expect(resolveBattleCount({ min: 2, max: 4 }, () => 0.5)).toBe(3)
  })
})

describe('EXPEDITION_CHAINS', () => {
  it('includes campaign-main chain over tutorial scenarios', () => {
    const chain = EXPEDITION_CHAINS.find((c) => c.id === 'campaign-main')
    expect(chain).toBeDefined()
    expect(chain?.battleScenarioIds).toEqual(['tutorial', 'two-front', 'boss-lite'])
    expect(chain?.partySize).toBe(1)
    expect(chain?.battleCount).toBe(3)
    expect(chain?.interBattleReviveAllDowned).toBe(true)
  })
})
