import type { BaseStats, StatId } from '../config/baseStats'
import { getPassiveTemplate } from '../content/passiveTemplates'
import { getPassiveModTemplate } from '../content/passiveModTemplates'
import { scaleModValue } from '../memento/modScaling'
import type { PassiveEquipLoadout, PassiveInstance } from '../types'
import { computePassiveFlatBonus, computePassivePctBonus } from './passiveBonus'
import { getEquippedPassives } from './equippedPassives'

function passiveModStatMult(
  passive: PassiveInstance,
  effectKind: 'stat_flat' | 'stat_pct',
): number {
  let mult = 1
  for (const slot of passive.modSlots) {
    if (slot.status !== 'filled') continue
    const tmpl = getPassiveModTemplate(slot.templateId)
    if (!tmpl) continue
    for (const op of tmpl.ops) {
      if (effectKind === 'stat_flat' && op.kind === 'damage_mult') {
        mult += scaleModValue(op.base, slot.lm, op.scaleMode)
      }
      if (effectKind === 'stat_pct' && op.kind === 'heal_mult') {
        mult += scaleModValue(op.base, slot.lm, op.scaleMode)
      }
    }
  }
  return mult
}

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
      const flat = computePassiveFlatBonus(template.baseFlat, passive.global_level)
      bonuses[statId] =
        (bonuses[statId] ?? 0) +
        Math.round(flat * passiveModStatMult(passive, 'stat_flat'))
    }

    if (template.effectKind === 'stat_pct' && template.statId && template.basePct !== undefined) {
      const statId = template.statId
      const pct = computePassivePctBonus(baseStats[statId], template.basePct, passive.global_level)
      bonuses[statId] =
        (bonuses[statId] ?? 0) +
        Math.round(pct * passiveModStatMult(passive, 'stat_pct'))
    }
  }

  return bonuses
}
