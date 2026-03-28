/**
 * Формула стата §7: round(base × (1 + α·unitLevel + β·worldPower))
 * Коэффициенты — один источник правды для баланса MVP.
 */
export const UNIT_STAT_LEVEL_COEFF = 0.02
export const UNIT_STAT_WORLD_POWER_COEFF = 0.05

export type UnitStatInput = {
  baseStat: number
  unitLevel: number
  worldPower: number
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
