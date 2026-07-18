import { describe, expect, it } from 'vitest'
import {
  EXPEDITION_CHAINS,
  getExpeditionChainsByTier,
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
  it('includes campaign-main as static chain', () => {
    const chain = EXPEDITION_CHAINS.find((c) => c.id === 'campaign-main')
    expect(chain).toBeDefined()
    expect(chain?.kind).toBe('static')
    if (chain?.kind === 'static') {
      expect(chain.battleScenarioIds).toEqual(['tutorial', 'two-front', 'boss-lite'])
    }
    expect(chain?.label).toBeTruthy()
    expect(chain?.partyMin).toBe(1)
  })

  it('has unique ids and procedural entries', () => {
    const ids = EXPEDITION_CHAINS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(EXPEDITION_CHAINS.some((c) => c.id === 'chaotic-map' && c.kind === 'procedural')).toBe(true)
  })
})

describe('expedition chain UI metadata', () => {
  it('renames key mode labels', () => {
    const byId = Object.fromEntries(EXPEDITION_CHAINS.map((c) => [c.id, c]))
    expect(byId['chaotic-map']?.label).toBe('Хаос')
    expect(byId['small-skirmish']?.label).toBe('Дуэль')
    expect(byId['campaign-main']?.label).toBe('Компания')
  })

  it('assigns featured vs soon tiers', () => {
    const featured = getExpeditionChainsByTier('featured')
    const soon = getExpeditionChainsByTier('soon')
    expect(featured.map((c) => c.id)).toEqual([
      'chaotic-map',
      'tunnel',
      'big-arena',
      'small-skirmish',
      'ambush',
    ])
    expect(soon.map((c) => c.id)).toEqual(['campaign-main', 'test-single-battle'])
  })

  it('every chain has icon and param emoji line', () => {
    for (const chain of EXPEDITION_CHAINS) {
      expect(chain.iconEmoji.length).toBeGreaterThan(0)
      expect(chain.paramEmojiLine.length).toBeGreaterThan(0)
    }
  })
})
