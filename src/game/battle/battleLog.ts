import type { BattleLogEntry } from '../types'

export function formatBattleLogEntry(entry: BattleLogEntry): string {
  switch (entry.type) {
    case 'move':
      return `${entry.unitId}: (${entry.fromX},${entry.fromY}) → (${entry.toX},${entry.toY})`
    case 'strike': {
      const src = entry.fromCard
        ? `карта ${entry.fromCard.templateId} (${entry.fromCard.cardId})`
        : entry.attackKind === 'melee'
          ? 'ближний удар'
          : 'выстрел'
      const kill = entry.targetKilled ? ', цель уничтожена' : ''
      return `${entry.attackerId} → ${entry.targetId}: ${entry.damage} урона (${src})${kill}`
    }
    case 'card_level_up':
      return `Карта ${entry.templateId} (${entry.cardId}): уровень ${entry.fromLevel} → ${entry.toLevel}; выпало ${entry.roll} из 100`
    default: {
      const _exhaustive: never = entry
      return String(_exhaustive)
    }
  }
}
