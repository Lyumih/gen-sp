import type { ItemTemplate } from '../content/itemTemplates'
import type { EquipmentSlot, ItemInstance } from '../types'
import { UI_DAMAGE, UI_HEART, UI_LEVEL } from '../ui/labels'

const SLOT_LABEL_RU: Record<EquipmentSlot, string> = {
  weapon: 'Оружие',
  armor: 'Броня',
  accessory: 'Аксессуар',
}

export function equipmentSlotLabelRu(slot: EquipmentSlot): string {
  return SLOT_LABEL_RU[slot]
}

export function itemGearHpMult(t: ItemTemplate, itemLevel: number): number {
  return 1 + (t.hpPctPerLevel * itemLevel) / 100
}

export function itemGearDamageMult(t: ItemTemplate, itemLevel: number): number {
  return 1 + (t.damagePctPerLevel * itemLevel) / 100
}

function formatGearMult(m: number): string {
  return m.toFixed(2).replace(/\.?0+$/, '')
}

/** Строки про бонус за один уровень предмета (нулевые коэффициенты пропускаются). */
export function itemPerLevelBonusesLines(t: ItemTemplate): string[] {
  const out: string[] = []
  if (t.hpPctPerLevel > 0) {
    out.push(`+${t.hpPctPerLevel}% к max ${UI_HEART} за уровень предмета`)
  }
  if (t.damagePctPerLevel > 0) {
    out.push(`+${t.damagePctPerLevel}% к ${UI_DAMAGE} за уровень предмета`)
  }
  if (out.length === 0) {
    out.push('Нет бонусов за уровень предмета')
  }
  return out
}

export function itemPriceLine(amount: number): string {
  return `${amount} 💰`
}

/** Цена продажи в магазин (50% от shopPrice). */
export function itemSellPrice(t: ItemTemplate): number {
  return Math.floor(t.shopPrice * 0.5)
}

/** Сводка вкладов экземпляра (множители от уровня предмета). */
export function itemTotalBonusesAtLevel(
  t: ItemTemplate,
  itemLevel: number,
): { hpMult: number; damageMult: number } {
  return {
    hpMult: itemGearHpMult(t, itemLevel),
    damageMult: itemGearDamageMult(t, itemLevel),
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
  const { hpMult, damageMult } = itemTotalBonusesAtLevel(inst, itemLevel)
  const parts: string[] = [`${inst.label} · ${UI_LEVEL}${itemLevel}`]
  if (hpMult > 1) parts.push(`${UI_HEART} ×${formatGearMult(hpMult)}`)
  if (damageMult > 1) parts.push(`${UI_DAMAGE} ×${formatGearMult(damageMult)}`)
  return parts.join(' · ')
}

/** Полное текстовое описание экземпляра (для профиля / popover). */
export function itemInstanceDescriptionLines(
  t: ItemTemplate,
  itemLevel: number,
): string[] {
  const { hpMult, damageMult } = itemTotalBonusesAtLevel(t, itemLevel)
  const lines: string[] = [
    `${t.label} (${equipmentSlotLabelRu(t.slot)}), ${UI_LEVEL} предмета ${itemLevel}`,
  ]
  if (hpMult > 1) {
    lines.push(`Сейчас: max ${UI_HEART} ×${formatGearMult(hpMult)}`)
  } else {
    lines.push(`Сейчас: нет бонуса к max ${UI_HEART}`)
  }
  if (damageMult > 1) {
    lines.push(`Сейчас: ${UI_DAMAGE} ×${formatGearMult(damageMult)}`)
  } else {
    lines.push(`Сейчас: нет бонуса к ${UI_DAMAGE}`)
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
    return [`Неизвестный предмет: ${inst.templateId}, ${UI_LEVEL}${inst.itemLevel}`]
  }
  return itemInstanceDescriptionLines(t, inst.itemLevel)
}
