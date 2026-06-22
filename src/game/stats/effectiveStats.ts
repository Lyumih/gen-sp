import { computeUnitStat } from '../balance'
import type { BaseStats, StatId } from '../config/baseStats'
import type { ItemTemplate } from '../content/itemTemplates'
import type { EquipmentSlot, ItemInstance } from '../types'
import { aggregateGearHpBonus } from '../equipment/aggregates'

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
  const gearHp = aggregateGearHpBonus(member.items, member.equipment, getTemplate)
  return computeEffectiveStat(member.baseStats, 'health', member.unitLevel, worldPower, gearHp)
}
