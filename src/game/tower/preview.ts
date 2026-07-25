import { encounterSpecForTowerFloor } from '../encounter/encounterSpec'
import { generateInfiniteTower, rollTowerAffixId } from '../expedition/generators/infiniteTower'
import { getTowerAffixLabel } from './towerAffixes'

export function previewTowerFloor(runSeed: number, floor: number): {
  gruntCount: number
  bossCount: number
  affixLabel?: { title: string; description: string }
  firstClearGold: number
} {
  const affixId = rollTowerAffixId(runSeed, floor)
  const spec = encounterSpecForTowerFloor(floor, affixId)
  generateInfiniteTower({ runSeed, floor })
  return {
    gruntCount: spec.gruntCount,
    bossCount: spec.bossCount,
    ...(affixId !== undefined
      ? { affixLabel: getTowerAffixLabel(affixId) }
      : {}),
    firstClearGold: 50 + 10 * floor,
  }
}
