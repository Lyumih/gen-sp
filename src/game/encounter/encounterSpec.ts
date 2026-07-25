export type EncounterLayoutProfile = 'compact' | 'wide'

export type EncounterSpec = {
  gruntCount: number
  bossCount: number
  enemyUnitLevel: number
  skillTier: number
  poolTags: readonly string[]
  affixId?: string
  layoutProfile: EncounterLayoutProfile
}

export function towerCycleIndex(floor: number): { cycle: number; indexInCycle: number } {
  const safe = Math.max(1, Math.floor(floor))
  return {
    cycle: Math.ceil(safe / 10),
    indexInCycle: ((safe - 1) % 10) + 1,
  }
}

export function enemyUnitLevelForTowerCycle(cycle: number): number {
  return 1 + (Math.max(1, cycle) - 1) * 2
}

function gruntAndBossCounts(indexInCycle: number): { gruntCount: number; bossCount: number } {
  if (indexInCycle <= 4) {
    return { gruntCount: indexInCycle, bossCount: 0 }
  }
  if (indexInCycle === 5) {
    return { gruntCount: 4, bossCount: 1 }
  }
  if (indexInCycle <= 9) {
    return { gruntCount: indexInCycle - 1, bossCount: 1 }
  }
  return { gruntCount: 8, bossCount: 2 }
}

export function poolTagsForTowerCycle(cycle: number): readonly string[] {
  if (cycle <= 1) return ['arena', 'melee']
  return ['arena', 'melee', 'ranged']
}

export function encounterSpecForTowerFloor(floor: number, affixId?: string): EncounterSpec {
  const { cycle, indexInCycle } = towerCycleIndex(floor)
  const { gruntCount, bossCount } = gruntAndBossCounts(indexInCycle)
  const skillTier = cycle - 1
  const layoutProfile: EncounterLayoutProfile = indexInCycle <= 4 ? 'compact' : 'wide'

  return {
    gruntCount,
    bossCount,
    enemyUnitLevel: enemyUnitLevelForTowerCycle(cycle),
    skillTier,
    poolTags: poolTagsForTowerCycle(cycle),
    ...(floor >= 11 && affixId !== undefined ? { affixId } : {}),
    layoutProfile,
  }
}
