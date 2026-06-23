import { getItemTemplate } from '../../../game/content/itemTemplates'
import { itemSellPrice } from '../../../game/descriptions/itemText'
import type { ItemInstance } from '../../../game/types'

export function totalSellPriceForIds(
  ids: Set<string>,
  stash: readonly ItemInstance[],
): number {
  let sum = 0
  for (const id of ids) {
    const item = stash.find((i) => i.id === id)
    if (!item) continue
    const t = getItemTemplate(item.templateId)
    if (t) sum += itemSellPrice(t)
  }
  return sum
}
