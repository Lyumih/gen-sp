import { getCardDisplayLabel } from '../descriptions/cardText'
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
      return `${formatUnitRef(entry.attackerId, lookup)} → ${formatUnitRef(entry.targetId, lookup)}: ${entry.damage} ${UI_DAMAGE} (${src})${kill}`
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
    default: {
      const _exhaustive: never = entry
      return String(_exhaustive)
    }
  }
}
