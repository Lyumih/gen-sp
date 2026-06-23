import type { EquipmentSlot, ItemInstance } from '../types'
import type { ItemTemplate } from '../content/itemTemplates'
import { EQUIPMENT_ROLL_ORDER } from './equipmentOrder'

const STRIKE_DAMAGE_SLOTS: readonly EquipmentSlot[] = ['armor', 'accessory']

function sumPctMult(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
  slots: readonly EquipmentSlot[],
  pickPct: (t: ItemTemplate) => number,
): number {
  let sum = 0
  for (const slot of slots) {
    const itemId = equipment[slot]
    if (itemId === null) continue
    const inst = items.find((i) => i.id === itemId)
    if (!inst) continue
    const t = getTemplate(inst.templateId)
    if (!t) continue
    sum += pickPct(t) * inst.itemLevel
  }
  return 1 + sum / 100
}

export function aggregateGearHpMult(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): number {
  return sumPctMult(items, equipment, getTemplate, EQUIPMENT_ROLL_ORDER, (t) => t.hpPctPerLevel)
}

export function aggregateGearDamageMult(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): number {
  return sumPctMult(items, equipment, getTemplate, EQUIPMENT_ROLL_ORDER, (t) => t.damagePctPerLevel)
}

export function aggregateGearStrikeDamageMult(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): number {
  return sumPctMult(items, equipment, getTemplate, STRIKE_DAMAGE_SLOTS, (t) => t.damagePctPerLevel)
}
