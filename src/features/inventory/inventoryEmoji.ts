import type { CardAttackTemplate } from '../../game/content/cardTemplates'
import type { ItemTemplate } from '../../game/content/itemTemplates'
import type { PassiveTemplate } from '../../game/content/passiveTemplates'
import { getSemanticEmoji } from '../../game/ui/semanticEmoji'
import type { EquipmentSlot } from '../../game/types'

export const SLOT_EMOJI: Record<EquipmentSlot, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💍',
}

const CARD_DEFAULT_EMOJI = '🃏'
const PASSIVE_DEFAULT_EMOJI = '✨'

export function resolveItemEmoji(
  template: ItemTemplate | undefined,
  slot: EquipmentSlot,
): string {
  return template?.emoji ?? SLOT_EMOJI[slot]
}

export function resolveCardEmoji(template: CardAttackTemplate | undefined): string {
  if (!template) return CARD_DEFAULT_EMOJI
  if (template.emoji) return template.emoji
  const sem = getSemanticEmoji(template.semanticEmojiId)
  return sem?.base ?? CARD_DEFAULT_EMOJI
}

export function resolvePassiveEmoji(template: PassiveTemplate | undefined): string {
  if (!template) return PASSIVE_DEFAULT_EMOJI
  const sem = getSemanticEmoji(template.semanticEmojiId)
  return sem?.base ?? PASSIVE_DEFAULT_EMOJI
}
