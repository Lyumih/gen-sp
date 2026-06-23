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
  type ModCombatContext,
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

function formatMult(m: number): string {
  return m.toFixed(2).replace(/\.?0+$/, '')
}

function modDamageMultFromCtx(ctx: ModCombatContext): number {
  return applyDamageMods(100, ctx) / 100
}

function modHealMultFromCtx(ctx: ModCombatContext): number {
  return applyHealMods(100, ctx) / 100
}

function damageChainLines(
  levelForEffect: number,
  baseAmount: number,
  gearMult: number,
  modCtx: ModCombatContext,
  resourceEmoji: string,
): { lines: string[]; expected: number } {
  const afterGear = Math.round(baseAmount * gearMult)
  const modMult = modDamageMultFromCtx(modCtx)
  const expected = applyDamageMods(afterGear, modCtx)
  const lines = [
    `${resourceEmoji} база (${UI_LEVEL}${levelForEffect}): ${baseAmount}`,
    `Экипировка: ×${formatMult(gearMult)}`,
    `Моды: ×${formatMult(modMult)}`,
    `Итого: ${expected}`,
  ]
  return { lines, expected }
}

function healChainLines(
  levelForEffect: number,
  baseHeal: number,
  gearMult: number,
  modCtx: ModCombatContext,
): { lines: string[]; expected: number } {
  const afterGear = Math.round(baseHeal * gearMult)
  const modMult = modHealMultFromCtx(modCtx)
  const expected = applyHealMods(afterGear, modCtx)
  const lines = [
    `${UI_HEART} база (${UI_LEVEL}${levelForEffect}): ${baseHeal}`,
    `Экипировка: ×${formatMult(gearMult)}`,
    `Моды: ×${formatMult(modMult)}`,
    `Итого: ${expected}`,
  ]
  return { lines, expected }
}

export function describeCardCombatStats(
  card: CardInstance,
  gearDamageMult: number,
  gearStrikeDamageMult: number,
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
    weaponChannel !== null ? weaponChannel.itemLevel : card.global_level
  const gearMult = weaponChannel !== null ? gearStrikeDamageMult : gearDamageMult
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
    const { lines: chainLines, expected } = healChainLines(
      levelForEffect,
      baseHeal,
      gearDamageMult,
      modCtx,
    )
    const tokenLine =
      tmpl.healToken !== undefined
        ? `Токен ${UI_HEART}: ${tmpl.healToken}`
        : `Без токена (запасное ${UI_HEART} ${tmpl.fallbackHeal})`
    const cdLine =
      effectiveCd > 0 ? `Перезарядка: ${effectiveCd} ход(ов) героя` : null
    const lines = [
      `Лечение, дальность ${effectiveRange} ${UI_CELL}`,
      tokenLine,
      `${UI_LEVEL} карты: ${card.global_level}`,
      ...chainLines,
      ...(cdLine !== null ? [cdLine] : []),
    ]
    return { displayLabel, lines, expectedDamage: expected }
  }

  const baseDamage = computeCardAttackDamage(tmpl, levelForEffect)
  const { lines: chainLines, expected } = damageChainLines(
    levelForEffect,
    baseDamage,
    gearMult,
    modCtx,
    UI_DAMAGE,
  )
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
          `${UI_LEVEL} оружия: ${weaponChannel!.itemLevel}`,
        ]
      : [`${UI_LEVEL} карты: ${card.global_level}`]),
    ...chainLines,
    ...(cdLine !== null ? [cdLine] : []),
  ]

  return { displayLabel, lines, expectedDamage: expected }
}
