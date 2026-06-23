export function passiveTierMult(level: number): number {
  const tier = Math.floor(level / 100)
  return 1 + 0.5 * tier
}

export function computePassiveFlatBonus(baseFlat: number, level: number): number {
  return Math.round(baseFlat * passiveTierMult(level))
}

export function computePassivePctBonus(
  baseStat: number,
  basePct: number,
  level: number,
): number {
  return Math.round((baseStat * basePct) / 100 * passiveTierMult(level))
}
