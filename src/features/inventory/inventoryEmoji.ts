import type { CardAttackTemplate } from '../../game/content/cardTemplates'
import type { ItemTemplate } from '../../game/content/itemTemplates'
import type { EquipmentSlot } from '../../game/types'

export const SLOT_EMOJI: Record<EquipmentSlot, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💍',
}

const CARD_DEFAULT_EMOJI = '🃏'

export function resolveItemEmoji(
  template: ItemTemplate | undefined,
  slot: EquipmentSlot,
): string {
  return template?.emoji ?? SLOT_EMOJI[slot]
}

export function resolveCardEmoji(template: CardAttackTemplate | undefined): string {
  return template?.emoji ?? CARD_DEFAULT_EMOJI
}
