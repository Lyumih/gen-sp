import { computeCardAttackDamage } from '../content/cardAttackDamage'
import { getCardAttackTemplate } from '../content/cardTemplates'
import type { CardInstance } from '../types'
import { UI_CELL, UI_DAMAGE, UI_LEVEL } from '../ui/labels'

export function getCardDisplayLabel(templateId: string): string {
  const tmpl = getCardAttackTemplate(templateId)
  return tmpl?.label ?? templateId
}

export type CardCombatStatsDescription = {
  displayLabel: string
  lines: string[]
  /** null если шаблон атаки не найден */
  expectedDamage: number | null
}

export function describeCardCombatStats(
  card: CardInstance,
  gearCardLevelBonus: number,
): CardCombatStatsDescription {
  const displayLabel = getCardDisplayLabel(card.templateId)
  const tmpl = getCardAttackTemplate(card.templateId)
  if (!tmpl) {
    return {
      displayLabel,
      lines: ['Шаблон атаки не найден для этой карты.'],
      expectedDamage: null,
    }
  }

  const levelForDamage = card.global_level + gearCardLevelBonus
  const expectedDamage = computeCardAttackDamage(tmpl, levelForDamage)
  const kindRu = tmpl.kind === 'melee' ? 'Ближний бой' : 'Дальний бой'
  const tokenLine =
    tmpl.damageToken !== undefined
      ? `Токен ${UI_DAMAGE}: ${tmpl.damageToken}`
      : `Без токена (запасной ${UI_DAMAGE} ${tmpl.fallbackDamage})`

  const lines = [
    `${kindRu}, дальность ${tmpl.maxRange} ${UI_CELL}`,
    tokenLine,
    `${UI_LEVEL} карты: ${card.global_level}, бонус экипировки к ${UI_DAMAGE}: +${gearCardLevelBonus}`,
    `Эффективный ${UI_LEVEL} для ${UI_DAMAGE}: ${levelForDamage}`,
    `Ожидаемый ${UI_DAMAGE} сейчас: ${expectedDamage}`,
  ]

  return { displayLabel, lines, expectedDamage }
}
