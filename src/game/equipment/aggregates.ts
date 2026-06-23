import type { StatId } from '../config/baseStats'
import type { ItemTemplate } from '../content/itemTemplates'
import type { EquipmentSlot, ItemInstance } from '../types'
import { EQUIPMENT_ROLL_ORDER } from './equipmentOrder'

function legacyStatPct(t: ItemTemplate, statId: StatId): number {
  const explicit = t.statPctPerLevel?.[statId]
  if (explicit !== undefined) return explicit
  const legacy = t.damagePctPerLevel ?? 0
  if (legacy <= 0) return 0
  if (statId === 'attack') {
    if (t.recommendedClassId === 'mage' || t.recommendedClassId === 'warlock') return 0
    if (t.recommendedClassId === 'healer' && t.tags.includes('heal')) return 0
    return legacy
  }
  if (statId === 'magicPower') {
    if (t.recommendedClassId === 'mage' || t.recommendedClassId === 'warlock') return legacy
    return 0
  }
  if (statId === 'healPower') {
    if (t.recommendedClassId === 'healer') return legacy
    return 0
  }
  return 0
}

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

export function aggregateGearStatMult(
  statId: StatId,
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): number {
  return sumPctMult(
    items,
    equipment,
    getTemplate,
    EQUIPMENT_ROLL_ORDER,
    (t) => legacyStatPct(t, statId),
  )
}

/** @deprecated use aggregateGearStatMult */
export function aggregateGearDamageMult(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): number {
  return sumPctMult(items, equipment, getTemplate, EQUIPMENT_ROLL_ORDER, (t) =>
    legacyStatPct(t, 'attack'),
  )
}

/** @deprecated removed — strike uses attack stat gear mult */
export function aggregateGearStrikeDamageMult(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): number {
  return aggregateGearStatMult('attack', items, equipment, getTemplate)
}
