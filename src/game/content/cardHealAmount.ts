import { resolvePercentValue } from '../memento/resolvePercentToken'
import type { CardAttackTemplate } from './cardTemplates'

/** Лечение с карты; levelForDamage = global_level; gearDamageMult применяется в runReducer. */
export function computeCardHealAmount(
  template: CardAttackTemplate,
  levelForDamage: number,
): number {
  if (template.healToken !== undefined) {
    const v = resolvePercentValue(levelForDamage, template.healToken)
    if (v !== null) return v
  }
  return template.fallbackHeal ?? 0
}
