import { EQUIPMENT_ROLL_ORDER } from './equipmentOrder'
import { itemSellPrice } from '../descriptions/itemText'
import type { EquipmentSlot, ItemInstance } from '../types'
import type { ItemTemplate } from '../content/itemTemplates'

function equippedIdSet(equipment: Record<EquipmentSlot, string | null>): Set<string> {
  return new Set(
    EQUIPMENT_ROLL_ORDER.map((s) => equipment[s]).filter((id): id is string => id !== null),
  )
}

export function getStashItemIds(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
): string[] {
  const equipped = equippedIdSet(equipment)
  return items.filter((i) => !equipped.has(i.id)).map((i) => i.id)
}

export function buildItemsWithStashOrder(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
  stashItemIds: readonly string[],
): ItemInstance[] | null {
  const expectedStash = getStashItemIds(items, equipment)
  if (expectedStash.length !== stashItemIds.length) return null
  const expectedSet = new Set(expectedStash)
  for (const id of stashItemIds) {
    if (!expectedSet.has(id)) return null
  }

  const byId = new Map(items.map((i) => [i.id, i]))
  const equippedPart: ItemInstance[] = []
  for (const slot of EQUIPMENT_ROLL_ORDER) {
    const id = equipment[slot]
    if (id === null) continue
    const inst = byId.get(id)
    if (!inst) return null
    equippedPart.push(inst)
  }

  const stashPart: ItemInstance[] = []
  for (const id of stashItemIds) {
    const inst = byId.get(id)
    if (!inst) return null
    stashPart.push(inst)
  }

  return [...equippedPart, ...stashPart]
}

export function sortStashIdsBySlot(
  stash: readonly ItemInstance[],
  getTemplate: (templateId: string) => { slot: EquipmentSlot } | undefined,
): string[] {
  const slotOrder: Record<EquipmentSlot, number> = { weapon: 0, armor: 1, accessory: 2 }
  return [...stash]
    .sort((a, b) => {
      const sa = getTemplate(a.templateId)?.slot
      const sb = getTemplate(b.templateId)?.slot
      const oa = sa !== undefined ? slotOrder[sa] : 99
      const ob = sb !== undefined ? slotOrder[sb] : 99
      if (oa !== ob) return oa - ob
      return a.id.localeCompare(b.id)
    })
    .map((i) => i.id)
}

export function sortStashIdsByLevel(stash: readonly ItemInstance[]): string[] {
  return [...stash]
    .sort((a, b) => {
      if (b.itemLevel !== a.itemLevel) return b.itemLevel - a.itemLevel
      return a.id.localeCompare(b.id)
    })
    .map((i) => i.id)
}

export function stashItemsFromCampaign(
  items: readonly ItemInstance[],
  equipment: Record<EquipmentSlot, string | null>,
): ItemInstance[] {
  const equipped = equippedIdSet(equipment)
  return items.filter((i) => !equipped.has(i.id))
}

export function sellPriceForItem(
  item: ItemInstance,
  getTemplate: (templateId: string) => ItemTemplate | undefined,
): number {
  const tmpl = getTemplate(item.templateId)
  if (!tmpl) return 0
  return itemSellPrice(tmpl)
}

export function isItemEquipped(
  itemId: string,
  equipment: Record<EquipmentSlot, string | null>,
): boolean {
  return EQUIPMENT_ROLL_ORDER.some((s) => equipment[s] === itemId)
}
