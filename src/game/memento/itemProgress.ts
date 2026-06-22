import type { ItemInstance } from '../types'
import { afterCarrierLevelChange, modOfferSeed } from './carrierLevelChange'
import { rollCardLevelUp } from './rollCardLevelUp'

/**
 * Одно «использование» предмета (базовая атака оружия или получение удара бронёй/акс.):
 * бросок Memento на itemLevel, при успехе — syncModSlotsForLevel через afterCarrierLevelChange.
 */
export function applyItemUseRoll(
  item: ItemInstance,
  randomInt1to100: number,
): ItemInstance & { leveledUp: boolean } {
  const leveledUp = rollCardLevelUp(item.itemLevel, randomInt1to100)
  if (!leveledUp) {
    return { ...item, leveledUp: false }
  }
  const itemLevel = item.itemLevel + 1
  const next = afterCarrierLevelChange(
    { ...item, itemLevel },
    'item',
    item.templateId,
    itemLevel,
    modOfferSeed(item.id, 0, itemLevel),
  )
  return { ...next, leveledUp: true }
}
