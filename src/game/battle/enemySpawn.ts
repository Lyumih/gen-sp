import type { BaseStats } from '../config/baseStats'
import { BASE_STAT_IDS } from '../config/baseStats'
import { ENEMY_ARCHETYPE_IDS, getEnemyArchetype } from '../content/enemyArchetypes'

const VARIANCE_MIN = 0.5
const VARIANCE_RANGE = 1

function rollUniformVarianceMult(rng: () => number): number {
  return VARIANCE_MIN + rng() * VARIANCE_RANGE
}

export function rollVarianceMult(
  rng: () => number,
  chaotic: boolean,
  statCount: number,
): number | number[] {
  if (chaotic) {
    return Array.from({ length: statCount }, () => rollUniformVarianceMult(rng))
  }
  return rollUniformVarianceMult(rng)
}

export function applyVarianceToBaseStats(
  base: BaseStats,
  variance: number | readonly number[],
): BaseStats {
  const out = {} as BaseStats
  if (typeof variance === 'number') {
    for (const id of BASE_STAT_IDS) {
      out[id] = Math.round(base[id] * variance)
    }
    return out
  }
  BASE_STAT_IDS.forEach((id, i) => {
    out[id] = Math.round(base[id] * (variance[i] ?? 1))
  })
  return out
}

function archetypeMatchesPool(threatTags: readonly string[], poolTags: readonly string[]): boolean {
  return poolTags.every((tag) => threatTags.includes(tag))
}

function eligibleArchetypesForPool(poolTags: readonly string[]): readonly string[] {
  return ENEMY_ARCHETYPE_IDS.filter((id) => {
    const archetype = getEnemyArchetype(id)
    if (!archetype || archetype.spawnWeight <= 0 || archetype.isBoss) return false
    return archetypeMatchesPool(archetype.threatTags, poolTags)
  })
}

function pickWeightedArchetype(candidates: readonly string[], rng: () => number): string | undefined {
  let totalWeight = 0
  for (const id of candidates) {
    totalWeight += getEnemyArchetype(id)?.spawnWeight ?? 0
  }
  if (totalWeight <= 0) return undefined

  let roll = rng() * totalWeight
  for (const id of candidates) {
    const weight = getEnemyArchetype(id)?.spawnWeight ?? 0
    roll -= weight
    if (roll < 0) return id
  }
  return candidates[candidates.length - 1]
}

export function pickEnemyArchetypesFromPool(
  poolTags: readonly string[],
  count: number,
  rng: () => number,
): string[] {
  const candidates = eligibleArchetypesForPool(poolTags)
  if (candidates.length === 0 || count <= 0) return []

  const picks: string[] = []
  for (let i = 0; i < count; i++) {
    const id = pickWeightedArchetype(candidates, rng)
    if (id) picks.push(id)
  }
  return picks
}
