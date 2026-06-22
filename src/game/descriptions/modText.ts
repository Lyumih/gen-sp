import { getModTemplate, type ModOp } from '../content/modTemplates'
import { scaleModValue } from '../memento/modScaling'
import type { ModSlotState } from '../types'

function formatSignedPercent(decimal: number): string {
  const pct = Math.round(decimal * 100)
  if (pct === 0) return '0%'
  return pct > 0 ? `+${pct}%` : `${pct}%`
}

function formatPercent(decimal: number): string {
  return `${Math.round(decimal * 100)}%`
}

function formatModOpCombat(op: ModOp, lm: number): string {
  switch (op.kind) {
    case 'damage_mult':
      return `${formatSignedPercent(scaleModValue(op.base, lm, op.scaleMode))} урона`
    case 'heal_mult':
      return `${formatSignedPercent(scaleModValue(op.base, lm, op.scaleMode))} лечения`
    case 'aoe_center_damage_mult':
      return `${formatSignedPercent(scaleModValue(op.base, lm, op.scaleMode))} урона по центру`
    case 'mana_cost_mult':
      return `${formatSignedPercent(scaleModValue(op.base, lm, op.scaleMode))} стоимости маны`
    case 'range_add':
      return `${formatSignedFlat(scaleModValue(op.base, lm, op.scaleMode), 'клетка дальности')}`
    case 'aoe_size_add':
      return `${formatSignedFlat(scaleModValue(op.base, lm, op.scaleMode), 'к размеру области')}`
    case 'cooldown_add': {
      const v = scaleModValue(op.base, lm, op.scaleMode)
      const n = Math.round(v)
      return n === 0 ? '0 к перезарядке' : `${n > 0 ? '+' : ''}${n} к перезарядке`
    }
    case 'crit_chance_add':
      return `${formatSignedPercent(scaleModValue(op.base, lm, op.scaleMode))} шанс крита`
    case 'carrier_hp_add':
      return `${formatSignedFlat(scaleModValue(op.base, lm, op.scaleMode), 'maxHp')}`
    case 'defense_add':
      return `${formatSignedFlat(scaleModValue(op.base, lm, op.scaleMode), 'защиты')}`
    case 'initiative_add':
      return `${formatSignedFlat(scaleModValue(op.base, lm, op.scaleMode), 'инициативы')}`
    case 'self_heal_on_use':
      return `+${Math.round(scaleModValue(op.base, lm, op.scaleMode))} HP после применения`
    case 'lifesteal_pct':
      return `${formatPercent(scaleModValue(op.base, lm, op.scaleMode))} вампиризм`
    case 'proc_extra_hit':
      return `${formatPercent(op.baseChance)} шанс ${op.hits} доп. удар(ов)`
    case 'reflect_on_hit':
      return `${Math.round(scaleModValue(op.base, lm, op.scaleMode))} урона атакующему при получении удара`
    case 'self_heal_on_damaged':
      return `+${Math.round(scaleModValue(op.base, lm, op.scaleMode))} HP при получении урона`
    case 'heal_splash':
      return `${formatPercent(scaleModValue(op.splashRatio, lm, op.scaleMode))} лечения соседу`
  }
}

function formatSignedFlat(value: number, unit: string): string {
  const n = Math.round(value * 10) / 10
  const rounded = Number.isInteger(n) ? String(n) : n.toFixed(1)
  if (n === 0) return `0 ${unit}`
  return n > 0 ? `+${rounded} ${unit}` : `${rounded} ${unit}`
}

/** One-line combat summary for a mod at the given Lm. */
export function describeModCombat(templateId: string, lm: number): string {
  const tmpl = getModTemplate(templateId)
  if (!tmpl) return templateId
  if (tmpl.ops.length === 0) {
    return tmpl.descriptionLines[0] ?? tmpl.label
  }
  const effect = tmpl.ops.map((op) => formatModOpCombat(op, lm)).join('; ')
  const prefix = tmpl.emoji ? `${tmpl.emoji} ` : ''
  return `${prefix}${tmpl.label}: ${effect}`
}

/** Compact summary of all filled mod slots on a card (battle tooltip). */
export function describeCardModSummary(modSlots: readonly ModSlotState[]): string | null {
  const filled = modSlots.filter((slot): slot is Extract<ModSlotState, { status: 'filled' }> => slot.status === 'filled')
  if (filled.length === 0) return null
  return filled.map((slot) => describeModCombat(slot.templateId, slot.lm)).join(' · ')
}

export function describeModCodex(templateId: string): { label: string; lines: string[] } {
  const tmpl = getModTemplate(templateId)
  if (!tmpl) {
    return {
      label: templateId,
      lines: [`Неизвестный модификатор: ${templateId}`],
    }
  }

  const combatLine = describeModCombat(templateId, 0)
  return {
    label: tmpl.label,
    lines: [combatLine, ...tmpl.descriptionLines],
  }
}
