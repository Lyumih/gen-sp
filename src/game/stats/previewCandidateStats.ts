import type { EquipmentSlot } from '../../game/types'
import type { BaseStats } from '../../game/config/baseStats'
import { getItemTemplate } from '../../game/content/itemTemplates'
import { computeEffectiveStats } from '../../game/stats/effectiveStats'

export function previewGearHpMult(
  previewGear: Partial<Record<EquipmentSlot, string>>,
): number {
  let sum = 0
  for (const templateId of Object.values(previewGear)) {
    if (!templateId) continue
    const t = getItemTemplate(templateId)
    if (t) sum += t.hpPctPerLevel // item level 1 at hire preview
  }
  return 1 + sum / 100
}

export function previewCandidateEffectiveStats(
  baseStats: BaseStats,
  worldPower: number,
  previewGear: Partial<Record<EquipmentSlot, string>>,
): BaseStats {
  const scaled = computeEffectiveStats(baseStats, 1, worldPower)
  return {
    ...scaled,
    health: Math.round(scaled.health * previewGearHpMult(previewGear)),
  }
}
