/**
 * Формула стата §7: round(base × (1 + α·unitLevel + β·worldPower))
 * Коэффициенты — один источник правды для баланса MVP.
 */
export const PER_LEVEL_RATE = 0.01
export const UNIT_STAT_LEVEL_COEFF = PER_LEVEL_RATE
export const UNIT_STAT_WORLD_POWER_COEFF = PER_LEVEL_RATE

export type UnitStatInput = {
  baseStat: number
  unitLevel: number
  worldPower: number
}

/** round(base × (1 + level × rate)); default rate = 1% per level. */
export function scalePercentPerLevel(
  base: number,
  level: number,
  rate = PER_LEVEL_RATE,
): number {
  return Math.round(base * (1 + level * rate))
}

export function computeUnitStat(input: UnitStatInput): number {
  const { baseStat, unitLevel, worldPower } = input
  return Math.round(
    baseStat *
      (1 +
        UNIT_STAT_LEVEL_COEFF * unitLevel +
        UNIT_STAT_WORLD_POWER_COEFF * worldPower),
  )
}
