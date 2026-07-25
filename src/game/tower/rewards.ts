import type { TowerProgress } from '../types'

export function towerFirstClearGold(floor: number): number {
  return 50 + 10 * floor
}

export function towerFirstClearWorldPowerBonus(floor: number): number {
  return floor % 10 === 0 ? 1 : 0
}

export function applyTowerFirstClearRewards(
  progress: TowerProgress,
  clearedFloor: number,
): { progress: TowerProgress; gold: number; worldPower: number } {
  if (progress.floorsFirstCleared.includes(clearedFloor)) {
    return { progress, gold: 0, worldPower: 0 }
  }
  return {
    progress: {
      ...progress,
      floorsFirstCleared: [...progress.floorsFirstCleared, clearedFloor],
    },
    gold: towerFirstClearGold(clearedFloor),
    worldPower: towerFirstClearWorldPowerBonus(clearedFloor),
  }
}
