import { computeUnitStat } from '../balance'
import type { BaseStats, StatId } from '../config/baseStats'
import type { ItemTemplate } from '../content/itemTemplates'
import { aggregateGearHpMult } from '../equipment/aggregates'
import { EQUIPMENT_ROLL_ORDER } from '../equipment/equipmentOrder'
import { aggregatePassiveModBonuses } from '../mods/modPipeline'
import type { EquipmentSlot, ItemInstance } from '../types'

export function getEquippedItems(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
): ItemInstance[] {
  const out: ItemInstance[] = []
  for (const slot of EQUIPMENT_ROLL_ORDER) {
    const itemId = equipment[slot]
    if (itemId === null) continue
    const inst = items.find((i) => i.id === itemId)
    if (inst) out.push(inst)
  }
  return out
}

export function computeGearHpMult(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): number {
  return aggregateGearHpMult(items, equipment, getTemplate)
}

export function computeGearStatBonuses(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  _getTemplate: (templateId: string) => ItemTemplate | undefined,
): Partial<Record<StatId, number>> {
  const passive = aggregatePassiveModBonuses(getEquippedItems(items, equipment))
  return {
    defense: passive.defense,
    initiative: passive.initiative,
    // flat mod HP applied after mult in computeCharacterMaxHp
    health: passive.health,
  }
}

export function computeEffectiveStat(
  baseStats: BaseStats,
  statId: StatId,
  unitLevel: number,
  worldPower: number,
  gearBonus = 0,
): number {
  return (
    computeUnitStat({
      baseStat: baseStats[statId],
      unitLevel,
      worldPower,
    }) + gearBonus
  )
}

export function computeEffectiveStats(
  baseStats: BaseStats,
  unitLevel: number,
  worldPower: number,
  gearBonuses: Partial<Record<StatId, number>> = {},
): BaseStats {
  const out = { ...baseStats }
  for (const id of Object.keys(out) as StatId[]) {
    out[id] = computeEffectiveStat(
      baseStats,
      id,
      unitLevel,
      worldPower,
      gearBonuses[id] ?? 0,
    )
  }
  return out
}

export function computeCharacterMaxHp(
  member: {
    baseStats: BaseStats
    unitLevel: number
    items: readonly ItemInstance[]
    equipment: Record<EquipmentSlot, string | null>
  },
  worldPower: number,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): number {
  const scaled = computeUnitStat({
    baseStat: member.baseStats.health,
    unitLevel: member.unitLevel,
    worldPower,
  })
  const gearMult = computeGearHpMult(member.items, member.equipment, getTemplate)
  const passiveHp =
    computeGearStatBonuses(member.items, member.equipment, getTemplate).health ?? 0
  return Math.round(scaled * gearMult) + passiveHp
}
