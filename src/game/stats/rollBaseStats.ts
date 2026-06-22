import type { BaseStats, StatId } from '../config/baseStats'
import {
  BASE_STAT_BOUNDS,
  BASE_STAT_IDS,
  getStatAffinity,
} from '../config/baseStats'

export type StatAffinityKind = 'primary' | 'secondary' | 'normal'

export function rollUpperBound(configMax: number, affinity: StatAffinityKind): number {
  if (affinity === 'primary') return Math.round(configMax * 1.5)
  if (affinity === 'secondary') return Math.round(configMax * 1.25)
  return configMax
}

export function rollStatInRange(min: number, upper: number, rng: () => number): number {
  if (upper < min) return min
  return min + Math.floor(rng() * (upper - min + 1))
}

export function rollBaseStatsForClass(classId: string, rng: () => number): BaseStats {
  const stats = {} as BaseStats
  for (const id of BASE_STAT_IDS) {
    const { min, max } = BASE_STAT_BOUNDS[id]
    const affinity = getStatAffinity(classId, id)
    const upper = rollUpperBound(max, affinity)
    stats[id] = rollStatInRange(min, upper, rng)
  }
  return stats
}

export function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function rollBaseStatsDeterministic(classId: string, seedKey: string): BaseStats {
  let s = hashSeed(`${seedKey}:${classId}`) >>> 0
  const rng = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x1_0000_0000
  }
  return rollBaseStatsForClass(classId, rng)
}

export function emptyBaseStats(): BaseStats {
  const stats = {} as BaseStats
  for (const id of BASE_STAT_IDS) {
    stats[id] = BASE_STAT_BOUNDS[id].min
  }
  return stats
}

export type { StatId }
