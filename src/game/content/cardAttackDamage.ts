import { resolvePercentValue } from '../memento/resolvePercentToken'
import type { CardAttackTemplate } from './cardTemplates'

/**
 * Урон с карты для удара.
 * `levelForDamage` в бою = `card.global_level + battle.gearCardLevelBonus` (бонус экипировки не меняет `global_level` карты).
 */
export function computeCardAttackDamage(
  template: CardAttackTemplate,
  levelForDamage: number,
): number {
  if (template.damageToken !== undefined) {
    const v = resolvePercentValue(levelForDamage, template.damageToken)
    if (v !== null) return v
  }
  return template.fallbackDamage
}
