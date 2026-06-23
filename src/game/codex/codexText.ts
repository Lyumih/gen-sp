import { STARTER_HERO_BASE_STATS } from '../config/baseStats'
import {
  describeCardCombatStats,
} from '../descriptions/cardText'
import { describeClassCodex } from '../descriptions/classText'
import { describeEnemyCodex } from '../descriptions/enemyText'
import {
  equipmentSlotLabelRu,
  itemInstanceDescriptionLines,
  itemPerLevelBonusesLines,
} from '../descriptions/itemText'
import { describeModCodex } from '../descriptions/modText'
import { getCardAttackTemplate } from '../content/cardTemplates'
import { getItemTemplate } from '../content/itemTemplates'
import { getModTemplate } from '../content/modTemplates'
import { tagLabelRu } from '../content/tagTaxonomy'
import type { CardInstance, Character } from '../types'
import type { CodexEntry } from './registry'

const CODEX_PREVIEW_CHARACTER: Pick<
  Character,
  'baseStats' | 'unitLevel' | 'items' | 'equipment'
> = {
  baseStats: STARTER_HERO_BASE_STATS,
  unitLevel: 1,
  items: [],
  equipment: { weapon: null, armor: null, accessory: null },
}

function formatTagSummaryLine(tags: readonly string[]): string {
  if (tags.length === 0) return ''
  return `Теги: ${tags.map((id) => tagLabelRu(id)).join(' · ')}`
}

export function describeCodexEntry(
  entry: CodexEntry,
  worldPower = 0,
): { label: string; summaryLines: string[]; detailLines: string[] } {
  switch (entry.category) {
    case 'class': {
      const d = describeClassCodex(entry.templateId)
      return {
        label: d.label,
        summaryLines: d.summaryLines,
        detailLines: [...d.summaryLines, ...d.detailLines],
      }
    }
    case 'item': {
      const t = getItemTemplate(entry.templateId)
      if (!t) {
        return {
          label: entry.label,
          summaryLines: [`Неизвестный предмет: ${entry.templateId}`],
          detailLines: [],
        }
      }
      const tagLine = formatTagSummaryLine(t.tags ?? [])
      return {
        label: t.label,
        summaryLines: [
          equipmentSlotLabelRu(t.slot),
          ...itemPerLevelBonusesLines(t),
          ...(tagLine ? [tagLine] : []),
        ],
        detailLines: itemInstanceDescriptionLines(t, 1),
      }
    }
    case 'card': {
      const card: CardInstance = {
        id: 'codex-preview',
        templateId: entry.templateId,
        global_level: 1,
        uses_count: 0,
        modSlots: [],
      }
      const tmpl = getCardAttackTemplate(entry.templateId)
      const d = describeCardCombatStats(card, CODEX_PREVIEW_CHARACTER, { worldPower })
      const tagLine = tmpl ? formatTagSummaryLine(tmpl.tags) : ''
      return {
        label: d.displayLabel,
        summaryLines: [...d.lines.slice(0, 2), ...(tagLine ? [tagLine] : [])],
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
      const tmpl = getModTemplate(entry.templateId)
      const tagLine = tmpl ? formatTagSummaryLine(tmpl.tags) : ''
      return {
        label: d.label,
        summaryLines: [...d.lines.slice(0, 2), ...(tagLine ? [tagLine] : [])],
        detailLines: d.lines,
      }
    }
  }
}
