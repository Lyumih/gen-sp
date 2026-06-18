import { computeCardAttackDamage } from '../content/cardAttackDamage'
import { computeCardHealAmount } from '../content/cardHealAmount'
import { getCardAttackTemplate } from '../content/cardTemplates'
import type { CardInstance } from '../types'
import { UI_CELL, UI_DAMAGE, UI_HEART, UI_LEVEL } from '../ui/labels'

export function getCardDisplayLabel(templateId: string): string {
  const tmpl = getCardAttackTemplate(templateId)
  return tmpl?.label ?? templateId
}

export type CardCombatStatsDescription = {
  displayLabel: string
  lines: string[]
  /** null если шаблон не найден */
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
      lines: ['Шаблон умения не найден для этой карты.'],
      expectedDamage: null,
    }
  }

  const levelForEffect = card.global_level + gearCardLevelBonus

  if (tmpl.kind === 'heal') {
    const expectedHeal = computeCardHealAmount(tmpl, levelForEffect)
    const tokenLine =
      tmpl.healToken !== undefined
        ? `Токен ${UI_HEART}: ${tmpl.healToken}`
        : `Без токена (запасное ${UI_HEART} ${tmpl.fallbackHeal})`
    const cdLine =
      tmpl.cooldownTurns !== undefined && tmpl.cooldownTurns > 0
        ? `Перезарядка: ${tmpl.cooldownTurns} ход(ов) героя`
        : null
    const lines = [
      `Лечение, дальность ${tmpl.maxRange} ${UI_CELL}`,
      tokenLine,
      `${UI_LEVEL} карты: ${card.global_level}, бонус экипировки: +${gearCardLevelBonus}`,
      `Ожидаемое ${UI_HEART} сейчас: ${expectedHeal}`,
      ...(cdLine !== null ? [cdLine] : []),
    ]
    return { displayLabel, lines, expectedDamage: expectedHeal }
  }

  const expectedDamage = computeCardAttackDamage(tmpl, levelForEffect)
  const kindRu =
    tmpl.kind === 'melee'
      ? 'Ближний бой'
      : tmpl.kind === 'ranged'
        ? 'Дальний бой'
        : 'Дальний бой (область)'
  const rangeLine =
    tmpl.kind === 'aoe' && tmpl.aoeSize !== undefined
      ? `${kindRu}, дальность ${tmpl.maxRange} ${UI_CELL}, область ${tmpl.aoeSize}×${tmpl.aoeSize}`
      : `${kindRu}, дальность ${tmpl.maxRange} ${UI_CELL}`
  const tokenLine =
    tmpl.damageToken !== undefined
      ? `Токен ${UI_DAMAGE}: ${tmpl.damageToken}`
      : `Без токена (запасной ${UI_DAMAGE} ${tmpl.fallbackDamage})`
  const cdLine =
    tmpl.cooldownTurns !== undefined && tmpl.cooldownTurns > 0
      ? `Перезарядка: ${tmpl.cooldownTurns} ход(ов) героя`
      : null

  const lines = [
    rangeLine,
    tokenLine,
    `${UI_LEVEL} карты: ${card.global_level}, бонус экипировки к ${UI_DAMAGE}: +${gearCardLevelBonus}`,
    `Эффективный ${UI_LEVEL} для ${UI_DAMAGE}: ${levelForEffect}`,
    `Ожидаемый ${UI_DAMAGE} сейчас: ${expectedDamage}`,
    ...(cdLine !== null ? [cdLine] : []),
  ]

  return { displayLabel, lines, expectedDamage }
}
