import { BASE_STAT_IDS, BASE_STAT_META } from '../config/baseStats'
import { getCharacterClass } from '../content/characterClasses'
import { getCardAttackTemplate } from '../content/cardTemplates'
import { getEnemyArchetype } from '../content/enemyArchetypes'
import { getEnemyPassiveTemplate } from '../content/enemyPassiveTemplates'
import { getRaceDefinition, type DamageTag, type RaceId } from '../content/enemyRaces'
import { tagLabelRu } from '../content/tagTaxonomy'
import type { BaseStats } from '../types'

function formatPercent(decimal: number): string {
  return `${Math.round(decimal * 100)}%`
}

function formatBaseStatStripLine(baseStats: BaseStats): string {
  return BASE_STAT_IDS.map((id) => `${BASE_STAT_META[id].emoji}${baseStats[id]}`).join(' ')
}

function formatDamageTagMods(
  mods: Partial<Record<DamageTag, number>>,
  kind: 'resist' | 'vulnerable',
): string[] {
  const prefix = kind === 'resist' ? 'Резист' : 'Уязвимость'
  return Object.entries(mods).map(([tag, value]) => {
    const label = tagLabelRu(tag)
    const pct = formatPercent(value!)
    return kind === 'resist' ? `${prefix} ${label}: −${pct}` : `${prefix} ${label}: +${pct}`
  })
}

export function describeRaceResistLines(raceId: RaceId): string[] {
  const race = getRaceDefinition(raceId)
  const lines: string[] = []
  if (race.traitDescriptionRu) {
    lines.push(`Трейт расы: ${race.traitDescriptionRu}`)
  }
  lines.push(...formatDamageTagMods(race.resists, 'resist'))
  lines.push(...formatDamageTagMods(race.vulnerables, 'vulnerable'))
  return lines
}

export function describeEnemyCodex(
  archetypeId: string,
  _unitLevel = 1,
): {
  label: string
  summaryLines: string[]
  detailLines: string[]
  isBoss: boolean
} {
  const archetype = getEnemyArchetype(archetypeId)
  if (!archetype) {
    return {
      label: archetypeId,
      summaryLines: [`Неизвестный враг: ${archetypeId}`],
      detailLines: [],
      isBoss: false,
    }
  }

  const race = getRaceDefinition(archetype.raceId)
  const classLabel = archetype.classId
    ? (getCharacterClass(archetype.classId)?.label ?? archetype.classId)
    : null
  const counterLabel =
    getCharacterClass(archetype.counterClass)?.label ?? archetype.counterClass

  const summaryLines: string[] = [
    `Раса: ${race.labelRu}`,
    ...(classLabel ? [`Класс: ${classLabel}`] : []),
    `Слаб к классу: ${counterLabel}`,
    `База: ${formatBaseStatStripLine(archetype.baseStats)}`,
  ]

  const detailLines: string[] = [
    ...summaryLines,
    ...describeRaceResistLines(archetype.raceId),
  ]

  if (archetype.skillPresets.length > 0) {
    detailLines.push(
      `Умения: ${archetype.skillPresets
        .map((preset) => {
          const tmpl = getCardAttackTemplate(preset.templateId)
          const label = tmpl?.label ?? preset.templateId
          return `${label} (L${preset.global_level})`
        })
        .join(', ')}`,
    )
  }

  if (archetype.passivePresets.length > 0) {
    detailLines.push(
      `Пассивы: ${archetype.passivePresets
        .map((preset) => {
          const tmpl = getEnemyPassiveTemplate(preset.templateId)
          const label = tmpl?.label ?? preset.templateId
          return `${label} (L${preset.global_level})`
        })
        .join(', ')}`,
    )
  }

  detailLines.push(archetype.descriptionRu)

  return {
    label: archetype.label,
    summaryLines,
    detailLines,
    isBoss: archetype.isBoss === true,
  }
}
