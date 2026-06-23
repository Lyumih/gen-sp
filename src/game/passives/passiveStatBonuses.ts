import type { BaseStats, StatId } from '../config/baseStats'
import { getPassiveTemplate } from '../content/passiveTemplates'
import type { PassiveEquipLoadout, PassiveInstance } from '../types'
import { computePassiveFlatBonus, computePassivePctBonus } from './passiveBonus'
import { getEquippedPassives } from './equippedPassives'

export function aggregatePassiveSkillStatBonuses(
  passives: readonly PassiveInstance[],
  passiveEquip: PassiveEquipLoadout,
  baseStats: BaseStats,
): Partial<Record<StatId, number>> {
  const equipped = getEquippedPassives(passives, passiveEquip)
  const bonuses: Partial<Record<StatId, number>> = {}

  for (const passive of equipped) {
    const template = getPassiveTemplate(passive.templateId)
    if (!template) continue

    if (template.effectKind === 'stat_flat' && template.statId && template.baseFlat) {
      const statId = template.statId
      bonuses[statId] =
        (bonuses[statId] ?? 0) +
        computePassiveFlatBonus(template.baseFlat, passive.global_level)
    }

    if (template.effectKind === 'stat_pct' && template.statId && template.basePct !== undefined) {
      const statId = template.statId
      bonuses[statId] =
        (bonuses[statId] ?? 0) +
        computePassivePctBonus(baseStats[statId], template.basePct, passive.global_level)
    }
  }

  return bonuses
}
