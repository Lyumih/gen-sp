import type { BaseStats, StatId } from '../config/baseStats'
import {
  BASE_STAT_BOUNDS,
  BASE_STAT_IDS,
  CLASS_MANA_REGEN_ROLL_MAX,
  CLASS_MANA_ROLL_MAX,
  getStatAffinity,
  type ClassId,
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
    if (id === 'mana' || id === 'manaRegen') continue
    const { min, max } = BASE_STAT_BOUNDS[id]
    const affinity = getStatAffinity(classId, id)
    const upper = rollUpperBound(max, affinity)
    stats[id] = rollStatInRange(min, upper, rng)
  }
  const manaStats = rollClassManaStats(classId, rng)
  stats.mana = manaStats.mana
  stats.manaRegen = manaStats.manaRegen
  return stats
}

export function rollClassManaStats(
  classId: string,
  rng: () => number,
): Pick<BaseStats, 'mana' | 'manaRegen'> {
  const cid = classId as ClassId
  const manaMax = CLASS_MANA_ROLL_MAX[cid] ?? 0
  const regenMax = CLASS_MANA_REGEN_ROLL_MAX[cid] ?? 0
  return {
    mana: rollStatInRange(0, manaMax, rng),
    manaRegen: rollStatInRange(0, regenMax, rng),
  }
}

export function rollClassManaStatsDeterministic(
  classId: string,
  seedKey: string,
): Pick<BaseStats, 'mana' | 'manaRegen'> {
  let s = hashSeed(`${seedKey}:classMana:${classId}`) >>> 0
  const rng = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x1_0000_0000
  }
  return rollClassManaStats(classId, rng)
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
