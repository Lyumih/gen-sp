import { getCardDisplayLabel } from '../descriptions/cardText'
import type { BattleLogEntry } from '../types'
import { UI_DAMAGE, UI_HEART } from '../ui/labels'

function unitLabel(unitId: string): string {
  return unitId === 'hero' ? 'Героя' : unitId
}

export function formatBattleLogEntry(entry: BattleLogEntry): string {
  switch (entry.type) {
    case 'move':
      return `${entry.unitId}: (${entry.fromX},${entry.fromY}) → (${entry.toX},${entry.toY})`
    case 'strike': {
      const src = entry.fromCard
        ? `карта «${getCardDisplayLabel(entry.fromCard.templateId)}»`
        : entry.attackKind === 'melee'
          ? 'ближний удар'
          : entry.attackKind === 'aoe'
            ? 'область'
            : 'выстрел'
      const kill = entry.targetKilled ? ', цель уничтожена' : ''
      return `${entry.attackerId} → ${entry.targetId}: ${entry.damage} ${UI_DAMAGE} (${src})${kill}`
    }
    case 'heal': {
      const src = entry.fromCard
        ? ` (${getCardDisplayLabel(entry.fromCard.templateId)})`
        : ''
      return `💚 ${unitLabel(entry.healerId)} исцеляет ${unitLabel(entry.targetId)} на ${entry.amount} ${UI_HEART}${src}`
    }
    case 'card_level_up':
      return `Карта «${getCardDisplayLabel(entry.templateId)}»: уровень ${entry.fromLevel} → ${entry.toLevel}; выпало ${entry.roll} из 100`
    default: {
      const _exhaustive: never = entry
      return String(_exhaustive)
    }
  }
}
