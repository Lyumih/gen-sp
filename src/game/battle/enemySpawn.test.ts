import { describe, expect, it } from 'vitest'
import { BASE_STAT_IDS } from '../config/baseStats'
import type { BaseStats } from '../config/baseStats'
import { getEnemyArchetype } from '../content/enemyArchetypes'
import { hashSeed } from '../stats/rollBaseStats'
import {
  applyVarianceToBaseStats,
  pickEnemyArchetypesFromPool,
  rollVarianceMult,
} from './enemySpawn'

function makeSeededRng(seedKey: string): () => number {
  let s = hashSeed(seedKey) >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x1_0000_0000
  }
}

const sampleBase: BaseStats = {
  health: 10,
  defense: 2,
  attack: 4,
  magicPower: 1,
  mana: 5,
  healPower: 0,
  speed: 2,
  initiative: 6,
  critChance: 3,
}

describe('rollVarianceMult', () => {
  it('returns a single multiplier in 0.5–1.5 for global variance', () => {
    const rng = makeSeededRng('global-variance')
    const mult = rollVarianceMult(rng, false, BASE_STAT_IDS.length)
    expect(typeof mult).toBe('number')
    expect(mult as number).toBeGreaterThanOrEqual(0.5)
    expect(mult as number).toBeLessThanOrEqual(1.5)
  })

  it('returns 9 independent multipliers for chaotic variance', () => {
    const rng = makeSeededRng('chaotic-variance')
    const mults = rollVarianceMult(rng, true, BASE_STAT_IDS.length) as number[]
    expect(mults).toHaveLength(9)
    for (const m of mults) {
      expect(m).toBeGreaterThanOrEqual(0.5)
      expect(m).toBeLessThanOrEqual(1.5)
    }
    expect(new Set(mults).size).toBeGreaterThan(1)
  })
})

describe('applyVarianceToBaseStats', () => {
  it('scales all stats proportionally with a global multiplier', () => {
    const out = applyVarianceToBaseStats(sampleBase, 1.2)
    for (const id of BASE_STAT_IDS) {
      expect(out[id]).toBe(Math.round(sampleBase[id] * 1.2))
    }
  })

  it('applies per-stat multipliers in BASE_STAT_IDS order', () => {
    const perStat = BASE_STAT_IDS.map((_, i) => 0.5 + i * 0.1)
    const out = applyVarianceToBaseStats(sampleBase, perStat)
    BASE_STAT_IDS.forEach((id, i) => {
      expect(out[id]).toBe(Math.round(sampleBase[id] * perStat[i]!))
    })
  })
})

describe('pickEnemyArchetypesFromPool', () => {
  it('never returns archetypes missing a pool tag', () => {
    const rng = makeSeededRng('forest-pool')
    const picks = pickEnemyArchetypesFromPool(['forest'], 20, rng)
    for (const id of picks) {
      const tags = getEnemyArchetype(id)?.threatTags ?? []
      expect(tags).toContain('forest')
    }
  })

  it('excludes zero-weight and boss entries from melee pool', () => {
    const rng = makeSeededRng('melee-pool')
    const picks = pickEnemyArchetypesFromPool(['melee'], 10, rng)
    expect(picks.length).toBeGreaterThan(0)
    for (const id of picks) {
      const a = getEnemyArchetype(id)
      expect(a?.isBoss).not.toBe(true)
      expect(a?.spawnWeight).toBeGreaterThan(0)
      expect(a?.threatTags).toContain('melee')
    }
  })

  it('respects spawnWeight when rng favors the heavier entry', () => {
    const picks: string[] = []
    const rng = () => 0.99
    for (let i = 0; i < 5; i++) {
      picks.push(...pickEnemyArchetypesFromPool(['melee'], 1, rng))
    }
    expect(picks.every((id) => id === 'enemy_orc_ravager')).toBe(true)
  })
})
