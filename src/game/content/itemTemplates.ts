import type { EquipmentSlot } from '../types'

export type ItemTemplate = {
  /** Совпадает с ключом в каталоге и с `ItemInstance.templateId`. */
  id: string
  slot: EquipmentSlot
  shopPrice: number
  hpBonusPerItemLevel: number
  cardLevelBonusPerItemLevel: number
  label: string
}

export const ITEM_TEMPLATES: Readonly<Record<string, ItemTemplate>> = {
  wooden_sword: {
    id: 'wooden_sword',
    slot: 'weapon',
    shopPrice: 10,
    hpBonusPerItemLevel: 0,
    cardLevelBonusPerItemLevel: 1,
    label: 'Деревянный меч',
  },
  leather_armor: {
    id: 'leather_armor',
    slot: 'armor',
    shopPrice: 15,
    hpBonusPerItemLevel: 2,
    cardLevelBonusPerItemLevel: 0,
    label: 'Кожаная броня',
  },
  copper_ring: {
    id: 'copper_ring',
    slot: 'accessory',
    shopPrice: 20,
    hpBonusPerItemLevel: 1,
    cardLevelBonusPerItemLevel: 1,
    label: 'Медное кольцо',
  },
}

export function getItemTemplate(templateId: string): ItemTemplate | undefined {
  return ITEM_TEMPLATES[templateId]
}

export const SHOP_TEMPLATE_IDS: readonly string[] = Object.keys(ITEM_TEMPLATES)
