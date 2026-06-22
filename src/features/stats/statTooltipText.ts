import type { StatId } from '../../game/config/baseStats'
import { BASE_STAT_META } from '../../game/config/baseStats'
import { CLASS_STAT_AFFINITY, type ClassId } from '../../game/config/baseStats'
import { getCharacterClass } from '../../game/content/characterClasses'
import type { BaseStats } from '../../game/types'

function affinityLabel(kind: 'primary' | 'secondary'): string {
  return kind === 'primary' ? 'Primary (+50% диапазон)' : 'Secondary (+25%)'
}

function formatStatList(ids: StatId[]): string {
  return ids.map((id) => `${BASE_STAT_META[id].emoji} ${BASE_STAT_META[id].labelRu}`).join(', ')
}

export function statTooltipLines(
  statId: StatId,
  baseValue: number,
  effectiveValue?: number,
): string[] {
  const meta = BASE_STAT_META[statId]
  const lines = [`${meta.labelRu} (${meta.emoji})`, meta.descriptionRu, `База: ${baseValue}`]
  if (effectiveValue !== undefined && effectiveValue !== baseValue) {
    lines.push(`→ с экипировкой: ${effectiveValue}`)
  } else if (effectiveValue !== undefined) {
    lines.push(`→ итог: ${effectiveValue}`)
  }
  return lines
}

export function classAffinityTooltipLines(classId: string): string[] {
  const cls = getCharacterClass(classId)
  const affinity = CLASS_STAT_AFFINITY[classId as ClassId]
  if (!cls || !affinity) return [classId]
  return [
    cls.label,
    `${affinityLabel('primary')}: ${formatStatList(affinity.primary)}`,
    `${affinityLabel('secondary')}: ${formatStatList(affinity.secondary)}`,
  ]
}

export function ratingTooltipLines(rating: number, percentLabel: string): string[] {
  return [
    `Средняя оценка базовых статов: ${rating.toFixed(2)} (${percentLabel} от cap)`,
  ]
}

export type { BaseStats }
