import type { EquipmentSlot } from '../../game/types'
import type { BaseStats } from '../../game/config/baseStats'
import { getItemTemplate } from '../../game/content/itemTemplates'
import { computeEffectiveStats } from '../../game/stats/effectiveStats'

export function previewGearHpBonus(
  previewGear: Partial<Record<EquipmentSlot, string>>,
): number {
  let sum = 0
  for (const templateId of Object.values(previewGear)) {
    if (!templateId) continue
    const t = getItemTemplate(templateId)
    if (t) sum += t.hpBonusPerItemLevel
  }
  return sum
}

export function previewCandidateEffectiveStats(
  baseStats: BaseStats,
  worldPower: number,
  previewGear: Partial<Record<EquipmentSlot, string>>,
): BaseStats {
  return computeEffectiveStats(baseStats, 1, worldPower, {
    health: previewGearHpBonus(previewGear),
  })
}
