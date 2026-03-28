import type { ItemTemplate } from '../content/itemTemplates'
import type { EquipmentSlot, ItemInstance } from '../types'

const SLOT_LABEL_RU: Record<EquipmentSlot, string> = {
  weapon: 'Оружие',
  armor: 'Броня',
  accessory: 'Аксессуар',
}

export function equipmentSlotLabelRu(slot: EquipmentSlot): string {
  return SLOT_LABEL_RU[slot]
}

/** Строки про бонус за один уровень предмета (нулевые коэффициенты пропускаются). */
export function itemPerLevelBonusesLines(t: ItemTemplate): string[] {
  const out: string[] = []
  if (t.hpBonusPerItemLevel > 0) {
    out.push(`+${t.hpBonusPerItemLevel} к max HP за уровень предмета`)
  }
  if (t.cardLevelBonusPerItemLevel > 0) {
    out.push(
      `+${t.cardLevelBonusPerItemLevel} к уровню для урона карт за уровень предмета`,
    )
  }
  if (out.length === 0) {
    out.push('Нет бонусов за уровень предмета')
  }
  return out
}

export function itemTotalHpBonus(t: ItemTemplate, itemLevel: number): number {
  return t.hpBonusPerItemLevel * itemLevel
}

export function itemTotalCardLevelBonus(t: ItemTemplate, itemLevel: number): number {
  return t.cardLevelBonusPerItemLevel * itemLevel
}

/** Сводка вкладов экземпляра (числа). */
export function itemTotalBonusesAtLevel(
  t: ItemTemplate,
  itemLevel: number,
): { hp: number; cardLevel: number } {
  return {
    hp: itemTotalHpBonus(t, itemLevel),
    cardLevel: itemTotalCardLevelBonus(t, itemLevel),
  }
}

/** Краткая строка для магазина: слот, название, эффекты за уровень. */
export function itemShopSummaryLine(t: ItemTemplate): string {
  const slot = equipmentSlotLabelRu(t.slot)
  const bonuses = itemPerLevelBonusesLines(t).join('; ')
  return `${t.label} · ${slot} · ${bonuses}`
}

/**
 * Короткая подпись для Select / списков: название, уровень, суммарные бонусы.
 */
export function itemSelectShortLabel(inst: ItemTemplate, itemLevel: number): string {
  const { hp, cardLevel } = itemTotalBonusesAtLevel(inst, itemLevel)
  const parts: string[] = [`${inst.label} · ур. ${itemLevel}`]
  if (hp > 0) parts.push(`HP +${hp}`)
  if (cardLevel > 0) parts.push(`урон карт +${cardLevel}`)
  return parts.join(' · ')
}

/** Полное текстовое описание экземпляра (для профиля / popover). */
export function itemInstanceDescriptionLines(
  t: ItemTemplate,
  itemLevel: number,
): string[] {
  const { hp, cardLevel } = itemTotalBonusesAtLevel(t, itemLevel)
  const lines: string[] = [
    `${t.label} (${equipmentSlotLabelRu(t.slot)}), уровень предмета ${itemLevel}`,
  ]
  if (hp > 0) {
    lines.push(`Сейчас: +${hp} к max HP`)
  } else {
    lines.push('Сейчас: нет бонуса к max HP')
  }
  if (cardLevel > 0) {
    lines.push(`Сейчас: +${cardLevel} к уровню для урона карт`)
  } else {
    lines.push('Сейчас: нет бонуса к урону карт')
  }
  lines.push(...itemPerLevelBonusesLines(t).map((s) => `За уровень: ${s}`))
  return lines
}

export function itemInstanceDescriptionLinesFromInstance(
  inst: ItemInstance,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): string[] {
  const t = getTemplate(inst.templateId)
  if (!t) {
    return [`Неизвестный предмет: ${inst.templateId}, ур. ${inst.itemLevel}`]
  }
  return itemInstanceDescriptionLines(t, inst.itemLevel)
}
