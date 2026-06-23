import { BASE_STAT_META, CLASS_STAT_AFFINITY, type ClassId, type StatId } from '../config/baseStats'
import { getCharacterClass } from '../content/characterClasses'
import { tagLabelRu } from '../content/tagTaxonomy'

function affinityLabel(kind: 'primary' | 'secondary'): string {
  return kind === 'primary' ? 'Primary (+50% диапазон)' : 'Secondary (+25%)'
}

function formatStatList(ids: StatId[]): string {
  return ids.map((id) => `${BASE_STAT_META[id].emoji} ${BASE_STAT_META[id].labelRu}`).join(', ')
}

function formatTagLine(tagIds: readonly string[]): string {
  return tagIds.map((id) => tagLabelRu(id)).join(' · ')
}

export function describeClassCodex(classId: string): {
  label: string
  summaryLines: string[]
  detailLines: string[]
  tagIds: readonly string[]
} {
  const cls = getCharacterClass(classId)
  const affinity = CLASS_STAT_AFFINITY[classId as ClassId]
  if (!cls || !affinity) {
    return {
      label: classId,
      summaryLines: [`Неизвестный класс: ${classId}`],
      detailLines: [],
      tagIds: [],
    }
  }

  const tagIds = cls.tags
  const summaryLines = [
    `Теги: ${formatTagLine(tagIds)}`,
    `${affinityLabel('primary')}: ${formatStatList(affinity.primary)}`,
    `${affinityLabel('secondary')}: ${formatStatList(affinity.secondary)}`,
  ]
  const detailLines = [cls.descriptionRu]

  return {
    label: cls.label,
    summaryLines,
    detailLines,
    tagIds,
  }
}
