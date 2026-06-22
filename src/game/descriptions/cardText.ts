import { computeCardAttackDamage } from '../content/cardAttackDamage'
import { computeCardHealAmount } from '../content/cardHealAmount'
import { getCardAttackTemplate } from '../content/cardTemplates'
import { resolveStrikeWeaponChannel } from '../equipment/virtualFists'
import { resolveCarrierTags } from '../mods/carrierTags'
import {
  applyAoeSizeMods,
  applyCooldownMods,
  applyDamageMods,
  applyHealMods,
  applyRangeMods,
} from '../mods/modPipeline'
import type { CardInstance, ItemInstance } from '../types'
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

function modContextForCard(card: CardInstance) {
  return {
    carrierTags: resolveCarrierTags('card', card.templateId),
    modSlots: card.modSlots,
    rng: () => 50,
  }
}

export function describeCardCombatStats(
  card: CardInstance,
  gearCardLevelBonus: number,
  equippedWeapon: ItemInstance | null = null,
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

  const isStrikeChannel = card.templateId === 'strike'
  const weaponChannel = isStrikeChannel
    ? resolveStrikeWeaponChannel(equippedWeapon?.id ?? null, equippedWeapon ? [equippedWeapon] : [])
    : null
  const levelForEffect =
    weaponChannel !== null
      ? weaponChannel.itemLevel + gearCardLevelBonus
      : card.global_level + gearCardLevelBonus
  const modCtx =
    weaponChannel !== null
      ? {
          carrierTags: resolveCarrierTags('item', weaponChannel.templateId),
          modSlots: weaponChannel.modSlots,
          rng: () => 50,
        }
      : modContextForCard(card)
  const effectiveRange = applyRangeMods(tmpl.maxRange, modCtx)
  const effectiveCd = applyCooldownMods(tmpl.cooldownTurns ?? 0, modCtx)

  if (tmpl.kind === 'heal') {
    const baseHeal = computeCardHealAmount(tmpl, levelForEffect)
    const expectedHeal = applyHealMods(baseHeal, modCtx)
    const tokenLine =
      tmpl.healToken !== undefined
        ? `Токен ${UI_HEART}: ${tmpl.healToken}`
        : `Без токена (запасное ${UI_HEART} ${tmpl.fallbackHeal})`
    const cdLine =
      effectiveCd > 0 ? `Перезарядка: ${effectiveCd} ход(ов) героя` : null
    const lines = [
      `Лечение, дальность ${effectiveRange} ${UI_CELL}`,
      tokenLine,
      `${UI_LEVEL} карты: ${card.global_level}, бонус экипировки: +${gearCardLevelBonus}`,
      `Ожидаемое ${UI_HEART} сейчас: ${expectedHeal}`,
      ...(cdLine !== null ? [cdLine] : []),
    ]
    return { displayLabel, lines, expectedDamage: expectedHeal }
  }

  const baseDamage = computeCardAttackDamage(tmpl, levelForEffect)
  const expectedDamage = applyDamageMods(baseDamage, modCtx)
  const kindRu =
    tmpl.kind === 'melee'
      ? 'Ближний бой'
      : tmpl.kind === 'ranged'
        ? 'Дальний бой'
        : 'Дальний бой (область)'
  const effectiveAoeSize =
    tmpl.kind === 'aoe' && tmpl.aoeSize !== undefined
      ? applyAoeSizeMods(tmpl.aoeSize, modCtx)
      : undefined
  const rangeLine =
    tmpl.kind === 'aoe' && effectiveAoeSize !== undefined
      ? `${kindRu}, дальность ${effectiveRange} ${UI_CELL}, область ${effectiveAoeSize}×${effectiveAoeSize}`
      : `${kindRu}, дальность ${effectiveRange} ${UI_CELL}`
  const tokenLine =
    tmpl.damageToken !== undefined
      ? `Токен ${UI_DAMAGE}: ${tmpl.damageToken}`
      : `Без токена (запасной ${UI_DAMAGE} ${tmpl.fallbackDamage})`
  const cdLine =
    effectiveCd > 0 ? `Перезарядка: ${effectiveCd} ход(ов) героя` : null

  const lines = [
    rangeLine,
    tokenLine,
    ...(isStrikeChannel
      ? [
          `Канал оружия: ${weaponChannel!.itemId === null ? 'кулаки' : weaponChannel!.templateId}`,
          `${UI_LEVEL} оружия: ${weaponChannel!.itemLevel}, бонус экипировки к ${UI_DAMAGE}: +${gearCardLevelBonus}`,
        ]
      : [
          `${UI_LEVEL} карты: ${card.global_level}, бонус экипировки к ${UI_DAMAGE}: +${gearCardLevelBonus}`,
        ]),
    `Эффективный ${UI_LEVEL} для ${UI_DAMAGE}: ${levelForEffect}`,
    `Ожидаемый ${UI_DAMAGE} сейчас: ${expectedDamage}`,
    ...(cdLine !== null ? [cdLine] : []),
  ]

  return { displayLabel, lines, expectedDamage }
}
