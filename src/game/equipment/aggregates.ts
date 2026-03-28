import type { EquipmentSlot, ItemInstance } from '../types'
import type { ItemTemplate } from '../content/itemTemplates'
import { EQUIPMENT_ROLL_ORDER } from './equipmentOrder'

export function aggregateGearHpBonus(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): number {
  let sum = 0
  for (const slot of EQUIPMENT_ROLL_ORDER) {
    const itemId = equipment[slot]
    if (itemId === null) continue
    const inst = items.find((i) => i.id === itemId)
    if (!inst) continue
    const t = getTemplate(inst.templateId)
    if (!t) continue
    sum += t.hpBonusPerItemLevel * inst.itemLevel
  }
  return sum
}

export function aggregateGearCardLevelBonus(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): number {
  let sum = 0
  for (const slot of EQUIPMENT_ROLL_ORDER) {
    const itemId = equipment[slot]
    if (itemId === null) continue
    const inst = items.find((i) => i.id === itemId)
    if (!inst) continue
    const t = getTemplate(inst.templateId)
    if (!t) continue
    sum += t.cardLevelBonusPerItemLevel * inst.itemLevel
  }
  return sum
}
