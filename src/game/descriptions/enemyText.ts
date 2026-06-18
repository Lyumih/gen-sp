import { computeUnitStat } from '../balance'
import { getEnemyTemplate } from '../content/enemyTemplates'
import { UI_HEART, UI_LEVEL } from '../ui/labels'

export function describeEnemyCodex(
  templateId: string,
  unitLevel = 1,
): { label: string; lines: string[] } {
  const tmpl = getEnemyTemplate(templateId)
  if (!tmpl) {
    return {
      label: templateId,
      lines: [`Неизвестный враг: ${templateId}`],
    }
  }

  const maxHp = computeUnitStat({
    baseStat: tmpl.baseHpStat,
    unitLevel,
    worldPower: 0,
  })

  return {
    label: tmpl.label,
    lines: [
      `Базовый HP-стат: ${tmpl.baseHpStat}`,
      `Max ${UI_HEART} (ориентир ${UI_LEVEL}${unitLevel}): ${maxHp}`,
    ],
  }
}
