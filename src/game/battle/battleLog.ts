import { getCardDisplayLabel } from '../descriptions/cardText'
import { getPassiveTemplate } from '../content/passiveTemplates'
import type { BattleLogEntry } from '../types'
import type { UnitDisplay } from '../character/display'
import { UI_DAMAGE, UI_HEART } from '../ui/labels'

export type BattleLogUnitLookup = (unitId: string) => UnitDisplay | undefined

function formatUnitRef(unitId: string, lookup?: BattleLogUnitLookup): string {
  const d = lookup?.(unitId)
  if (d) return `${d.emoji} ${d.name}`
  return unitId === 'hero' ? 'Героя' : unitId
}

export function formatBattleLogEntry(
  entry: BattleLogEntry,
  lookup?: BattleLogUnitLookup,
): string {
  switch (entry.type) {
    case 'move':
      return `${formatUnitRef(entry.unitId, lookup)}: (${entry.fromX},${entry.fromY}) → (${entry.toX},${entry.toY})`
    case 'strike': {
      const src = entry.fromCard
        ? `карта «${getCardDisplayLabel(entry.fromCard.templateId)}»`
        : entry.attackKind === 'melee'
          ? 'ближний удар'
          : entry.attackKind === 'aoe'
            ? 'область'
            : 'выстрел'
      const kill = entry.targetKilled ? ', цель уничтожена' : ''
      const absorbed =
        entry.absorbedDamage !== undefined && entry.absorbedDamage > 0
          ? ` (поглощено ${entry.absorbedDamage})`
          : ''
      return `${formatUnitRef(entry.attackerId, lookup)} → ${formatUnitRef(entry.targetId, lookup)}: ${entry.damage} ${UI_DAMAGE}${absorbed} (${src})${kill}`
    }
    case 'heal': {
      const src = entry.fromCard
        ? ` (${getCardDisplayLabel(entry.fromCard.templateId)})`
        : ''
      return `💚 ${formatUnitRef(entry.healerId, lookup)} исцеляет ${formatUnitRef(entry.targetId, lookup)} на ${entry.amount} ${UI_HEART}${src}`
    }
    case 'card_level_up':
      return `Карта «${getCardDisplayLabel(entry.templateId)}»: уровень ${entry.fromLevel} → ${entry.toLevel}; выпало ${entry.roll} из 100`
    case 'mod_proc':
      return `✨ ${entry.label}!`
    case 'passive_proc': {
      const label = getPassiveTemplate(entry.templateId)?.label ?? entry.templateId
      return entry.procSuccess
        ? `✨ Навык «${label}» сработал`
        : `Навык «${label}»: не сработал`
    }
    case 'status_applied':
      return `${formatUnitRef(entry.unitId, lookup)}: статус «${entry.statusKind}»`
    case 'status_tick': {
      const parts: string[] = []
      if (entry.dotDamage !== undefined) parts.push(`${entry.dotDamage} ${UI_DAMAGE} DoT`)
      if (entry.regenHeal !== undefined) parts.push(`+${entry.regenHeal} ${UI_HEART}`)
      return `${formatUnitRef(entry.unitId, lookup)}: ${parts.join(', ') || 'тик статуса'}`
    }
    case 'resurrect': {
      const src = entry.fromCard
        ? ` (${getCardDisplayLabel(entry.fromCard.templateId)})`
        : ''
      return `✨ ${formatUnitRef(entry.healerId, lookup)} воскрешает ${formatUnitRef(entry.targetId, lookup)} с ${entry.hp} ${UI_HEART}${src}`
    }
    case 'world_power_gain':
      return `+${entry.amount} сила мира`
    default: {
      const _exhaustive: never = entry
      return String(_exhaustive)
    }
  }
}

export function battleLogEntryTone(
  entry: BattleLogEntry,
  unitSideLookup: (unitId: string) => 'player' | 'enemy' | undefined,
): 'hero' | 'enemy' | 'neutral' {
  const sideTone = (unitId: string): 'hero' | 'enemy' | 'neutral' => {
    const side = unitSideLookup(unitId)
    if (side === 'player') return 'hero'
    if (side === 'enemy') return 'enemy'
    return 'neutral'
  }

  switch (entry.type) {
    case 'move':
      return sideTone(entry.unitId)
    case 'strike':
      return sideTone(entry.attackerId)
    case 'heal':
    case 'resurrect':
      return sideTone(entry.healerId)
    case 'passive_proc':
      return entry.procSuccess ? sideTone(entry.unitId) : 'neutral'
    case 'status_applied':
    case 'card_level_up':
    case 'mod_proc':
    case 'status_tick':
    case 'world_power_gain':
      return 'neutral'
    default: {
      const _exhaustive: never = entry
      return _exhaustive
    }
  }
}
