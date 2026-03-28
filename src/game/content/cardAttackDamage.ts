import { resolvePercentValue } from '../memento/resolvePercentToken'
import type { CardAttackTemplate } from './cardTemplates'

/**
 * Урон с карты для удара: уровень — global_level до applyCardUse (спека этапа A).
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
