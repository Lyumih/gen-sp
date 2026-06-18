import {
  describeCardCombatStats,
} from '../descriptions/cardText'
import { describeEnemyCodex } from '../descriptions/enemyText'
import {
  equipmentSlotLabelRu,
  itemInstanceDescriptionLines,
  itemPerLevelBonusesLines,
} from '../descriptions/itemText'
import { describeModCodex } from '../descriptions/modText'
import { getItemTemplate } from '../content/itemTemplates'
import type { CardInstance } from '../types'
import type { CodexEntry } from './registry'

export function describeCodexEntry(
  entry: CodexEntry,
  gearCardLevelBonus = 0,
): { label: string; summaryLines: string[]; detailLines: string[] } {
  switch (entry.category) {
    case 'item': {
      const t = getItemTemplate(entry.templateId)
      if (!t) {
        return {
          label: entry.label,
          summaryLines: [`Неизвестный предмет: ${entry.templateId}`],
          detailLines: [],
        }
      }
      return {
        label: t.label,
        summaryLines: [equipmentSlotLabelRu(t.slot), ...itemPerLevelBonusesLines(t)],
        detailLines: itemInstanceDescriptionLines(t, 1),
      }
    }
    case 'card': {
      const card: CardInstance = {
        id: 'codex-preview',
        templateId: entry.templateId,
        global_level: 1,
        uses_count: 0,
        modifications: [],
      }
      const d = describeCardCombatStats(card, gearCardLevelBonus)
      return {
        label: d.displayLabel,
        summaryLines: d.lines.slice(0, 2),
        detailLines: d.lines,
      }
    }
    case 'enemy': {
      const d = describeEnemyCodex(entry.templateId, 1)
      return {
        label: d.label,
        summaryLines: d.lines.slice(-1),
        detailLines: d.lines,
      }
    }
    case 'mod': {
      const d = describeModCodex(entry.templateId)
      return {
        label: d.label,
        summaryLines: d.lines.slice(0, 1),
        detailLines: d.lines,
      }
    }
  }
}
