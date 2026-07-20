import { BASE_STAT_META } from '../config/baseStats'
import {
  getCardAttackTemplate,
  isHealKind,
  usesCardBuffDispatch,
} from '../content/cardTemplates'
import { resolveCarrierTags } from '../mods/carrierTags'
import {
  applyAoeSizeMods,
  applyCooldownMods,
  applyManaCostMods,
  applyRangeMods,
  type ModCombatContext,
} from '../mods/modPipeline'
import { resolveSkillForCard } from '../skills/resolveSkillForCard'
import type { CampaignState, CardInstance, Character, Unit } from '../types'
import { UI_CELL, UI_DAMAGE, UI_HEART, UI_LEVEL, UI_MANA } from '../ui/labels'

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

function modContextForCard(card: CardInstance): ModCombatContext {
  return {
    carrierTags: resolveCarrierTags('card', card.templateId),
    modSlots: card.modSlots,
    rng: () => 50,
  }
}

function formatMult(m: number): string {
  return m.toFixed(2).replace(/\.?0+$/, '')
}

function statLabel(statId: string): string {
  return BASE_STAT_META[statId as keyof typeof BASE_STAT_META]?.labelRu ?? statId
}

function skillChainLines(
  tmpl: NonNullable<ReturnType<typeof getCardAttackTemplate>>,
  card: CardInstance,
  character: Pick<Character, 'baseStats' | 'unitLevel' | 'items' | 'equipment'>,
  campaign: Pick<CampaignState, 'worldPower'>,
  actor?: Unit,
): { lines: string[]; expected: number | null } {
  const modCtx = modContextForCard(card)
  const resolved = resolveSkillForCard(
    campaign as CampaignState,
    character as Character,
    card,
    tmpl,
    modCtx,
    actor,
  )
  if (!resolved) {
    return { lines: ['Не удалось рассчитать эффект умения.'], expected: null }
  }

  const { core } = resolved
  const statEmoji = BASE_STAT_META[tmpl.statSource]?.emoji ?? ''
  const resourceEmoji = isHealKind(tmpl.kind) ? UI_HEART : UI_DAMAGE
  const gearMult = core.stat0 > 0 ? core.stat1 / core.stat0 : 1

  const lines = [
    `${statEmoji} ${statLabel(tmpl.statSource)}: ${core.stat0} → с экипировкой: ${core.stat1} (×${formatMult(gearMult)})`,
    `core = stat + flat: ${core.stat1} + ${tmpl.skillFlat} = ${core.core}`,
    `Масштаб ${tmpl.scaleToken} (${UI_LEVEL}${card.global_level}): ×${formatMult(core.skillMult)}`,
    `До модов: ${core.amountBeforeMods} ${resourceEmoji}`,
    `Итого: ${resolved.amount} ${resourceEmoji}`,
  ]
  return { lines, expected: resolved.amount }
}

export function describeCardCombatStats(
  card: CardInstance,
  character: Pick<Character, 'baseStats' | 'unitLevel' | 'items' | 'equipment'>,
  campaign: Pick<CampaignState, 'worldPower'>,
  actor?: Unit,
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

  const modCtx = modContextForCard(card)
  const effectiveRange = applyRangeMods(tmpl.maxRange, modCtx)
  const effectiveCd = applyCooldownMods(tmpl.cooldownTurns ?? 0, modCtx)
  const effectiveCost = applyManaCostMods(tmpl.manaCost, modCtx)
  const { lines: chainLines, expected } = skillChainLines(tmpl, card, character, campaign, actor)

  const kindRu =
    tmpl.kind === 'melee'
      ? 'Ближний бой'
      : tmpl.kind === 'aoe'
        ? 'Дальний бой (область)'
        : tmpl.kind === 'heal' || tmpl.kind === 'regen'
          ? 'Исцеление'
          : tmpl.kind === 'resurrect'
            ? 'Воскрешение'
            : usesCardBuffDispatch(tmpl.kind)
              ? 'Усиление союзника'
              : tmpl.kind === 'dot'
                ? 'Урон со временем'
                : tmpl.kind === 'lifesteal_spell'
                  ? 'Вампиризм'
                  : tmpl.kind === 'utility'
                    ? 'Утилита'
                    : 'Дальний бой'

  const effectiveAoeSize =
    tmpl.kind === 'aoe' && tmpl.aoeSize !== undefined
      ? applyAoeSizeMods(tmpl.aoeSize, modCtx)
      : undefined
  const rangeLine =
    tmpl.kind === 'aoe' && effectiveAoeSize !== undefined
      ? `${kindRu}, дальность ${effectiveRange} ${UI_CELL}, область ${effectiveAoeSize}×${effectiveAoeSize}`
      : `${kindRu}, дальность ${effectiveRange} ${UI_CELL}`

  const tokenLine = `Токен: ${tmpl.scaleToken} к stat «${statLabel(tmpl.statSource)}», flat +${tmpl.skillFlat}`
  const cdLine =
    effectiveCd > 0 ? `Перезарядка: ${effectiveCd} ход(ов) героя` : null

  const lines = [
    rangeLine,
    tokenLine,
    `${UI_LEVEL} карты: ${card.global_level}`,
    `Стоимость: ${UI_MANA}${effectiveCost}`,
    ...chainLines,
    ...(cdLine !== null ? [cdLine] : []),
  ]

  return { displayLabel, lines, expectedDamage: expected }
}
