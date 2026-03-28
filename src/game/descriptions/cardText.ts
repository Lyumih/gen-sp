import { computeCardAttackDamage } from '../content/cardAttackDamage'
import { getCardAttackTemplate } from '../content/cardTemplates'
import type { CardInstance } from '../types'

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
      ? `Токен урона: ${tmpl.damageToken}`
      : `Без токена (запасной урон ${tmpl.fallbackDamage})`

  const lines = [
    `${kindRu}, дальность ${tmpl.maxRange}`,
    tokenLine,
    `Уровень карты: ${card.global_level}, бонус экипировки к урону: +${gearCardLevelBonus}`,
    `Эффективный уровень для урона: ${levelForDamage}`,
    `Ожидаемый урон сейчас: ${expectedDamage}`,
  ]

  return { displayLabel, lines, expectedDamage }
}
