import { BASE_STAT_META } from '../config/baseStats'
import {
  getPassiveTemplate,
  type PassiveEffectKind,
  type PassiveTrigger,
} from '../content/passiveTemplates'
import { computePassiveFlatBonus, computePassivePctBonus } from '../passives/passiveBonus'
import type { CampaignState, Character, PassiveInstance } from '../types'
import { UI_LEVEL } from '../ui/labels'

export function getPassiveDisplayLabel(templateId: string): string {
  const tmpl = getPassiveTemplate(templateId)
  return tmpl?.label ?? templateId
}

export type PassiveStatsDescription = {
  displayLabel: string
  lines: string[]
}

const TRIGGER_LABEL_RU: Record<PassiveTrigger, string> = {
  on_strike: 'При базовой атаке',
  on_card_attack: 'При атаке картой',
  on_card_heal: 'При исцелении картой',
  on_regen_tick: 'При тике регенерации',
  on_damaged: 'При получении урона',
  on_move: 'При перемещении',
  on_turn_start: 'В начале хода',
  on_kill: 'При убийстве',
}

function statLabel(statId: string): string {
  return BASE_STAT_META[statId as keyof typeof BASE_STAT_META]?.labelRu ?? statId
}

function statEmoji(statId: string): string {
  return BASE_STAT_META[statId as keyof typeof BASE_STAT_META]?.emoji ?? ''
}

function bonusLines(
  effectKind: PassiveEffectKind,
  template: NonNullable<ReturnType<typeof getPassiveTemplate>>,
  level: number,
  character: Pick<Character, 'baseStats'>,
): string[] {
  if (effectKind === 'stat_flat' && template.statId && template.baseFlat) {
    const emoji = statEmoji(template.statId)
    const label = statLabel(template.statId)
    const atLevel = computePassiveFlatBonus(template.baseFlat, level)
    const at100 = computePassiveFlatBonus(template.baseFlat, 100)
    return [
      `${emoji} ${label}: +${atLevel} (${UI_LEVEL}${level})`,
      `При ${UI_LEVEL}100: +${at100}`,
    ]
  }

  if (effectKind === 'stat_pct' && template.statId && template.basePct !== undefined) {
    const emoji = statEmoji(template.statId)
    const label = statLabel(template.statId)
    const baseStat = character.baseStats[template.statId]
    const atLevel = computePassivePctBonus(baseStat, template.basePct, level)
    const at100 = computePassivePctBonus(baseStat, template.basePct, 100)
    return [
      `${emoji} ${label}: +${atLevel} (${template.basePct}% от базы, ${UI_LEVEL}${level})`,
      `При ${UI_LEVEL}100: +${at100}`,
    ]
  }

  if (effectKind === 'proc' && template.procChance !== undefined) {
    const pct = Math.round(template.procChance * 100)
    return [`Шанс срабатывания: ${pct}%`]
  }

  return []
}

export function describePassiveStats(
  passive: PassiveInstance,
  character: Pick<Character, 'baseStats' | 'unitLevel' | 'items' | 'equipment'>,
  _campaign: Pick<CampaignState, 'worldPower'>,
): PassiveStatsDescription {
  const displayLabel = getPassiveDisplayLabel(passive.templateId)
  const tmpl = getPassiveTemplate(passive.templateId)
  if (!tmpl) {
    return {
      displayLabel,
      lines: ['Шаблон навыка не найден.'],
    }
  }

  const lines = [
    TRIGGER_LABEL_RU[tmpl.levelTrigger],
    tmpl.descriptionRu,
    `${UI_LEVEL} навыка: ${passive.global_level}`,
    ...bonusLines(tmpl.effectKind, tmpl, passive.global_level, character),
  ]

  return { displayLabel, lines }
}
