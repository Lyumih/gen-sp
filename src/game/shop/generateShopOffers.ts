import {
  pickRandomSkillTemplateId,
  rollShopSkillOffer,
  SKILL_ACQUISITION,
  type SkillAcquisitionConfig,
} from '../config/skillAcquisition'
import { ITEM_TEMPLATES } from '../content/itemTemplates'
import type { ShopOffer } from '../types'

export const SHOP_ITEM_SLOT_COUNT = 5

function pickUniqueItemTemplateIds(rng: () => number, count: number): string[] {
  const pool = [...Object.keys(ITEM_TEMPLATES)]
  const picked: string[] = []
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length)
    picked.push(pool.splice(idx, 1)[0]!)
  }
  return picked
}

export function generateShopOffers(
  rng: () => number,
  cfg: SkillAcquisitionConfig = SKILL_ACQUISITION,
): ShopOffer[] {
  const itemIds = pickUniqueItemTemplateIds(rng, SHOP_ITEM_SLOT_COUNT)
  const offers: ShopOffer[] = itemIds.map((templateId) => ({
    kind: 'item',
    templateId,
  }))
  if (rollShopSkillOffer(rng(), cfg)) {
    offers.push({ kind: 'skill', templateId: pickRandomSkillTemplateId(rng) })
  }
  return offers
}
