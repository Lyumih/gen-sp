import type { BaseStats } from '../config/baseStats'
import { BASE_STAT_BOUNDS, BASE_STAT_IDS } from '../config/baseStats'

export function statQuality(value: number, configMax: number): number {
  if (configMax <= 0) return value <= 0 ? 1 : 0
  return value / configMax
}

export function computeBaseStatRating(baseStats: BaseStats): number {
  const sum = BASE_STAT_IDS.reduce(
    (acc, id) => acc + statQuality(baseStats[id], BASE_STAT_BOUNDS[id].max),
    0,
  )
  return sum / BASE_STAT_IDS.length
}

export function formatBaseStatRatingPercent(rating: number): string {
  return `${Math.round(rating * 100)}%`
}
