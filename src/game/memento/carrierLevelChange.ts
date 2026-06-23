import { MOD_OFFER_POOL } from '../content/modTemplates'
import { PASSIVE_MOD_OFFER_POOL } from '../content/passiveModTemplates'
import { resolveCarrierTags } from '../mods/carrierTags'
import type { CardInstance, ItemInstance, ModSlotState } from '../types'
import { generateOffer } from './modOffers'
import { syncModSlotsForLevel } from './modSlots'

export type ModCarrier = Pick<CardInstance, 'modSlots'> | Pick<ItemInstance, 'modSlots'>

export function occupiedModTemplateIds(slots: readonly ModSlotState[]): string[] {
  return slots
    .filter((s): s is Extract<ModSlotState, { status: 'filled' }> => s.status === 'filled')
    .map((s) => s.templateId)
}

export function modOfferSeed(carrierId: string, slotIndex: number, salt: number): number {
  let h = 0
  const key = `${carrierId}:${slotIndex}:${salt}`
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0
  }
  return Math.abs(h) + 1
}

export function afterCarrierLevelChange<T extends ModCarrier>(
  carrier: T,
  kind: 'card' | 'item' | 'passive',
  templateId: string,
  newLevel: number,
  seedBase: number,
): T {
  const tags = resolveCarrierTags(kind, templateId)
  if (tags.length === 0) return carrier

  const pool = kind === 'passive' ? PASSIVE_MOD_OFFER_POOL : MOD_OFFER_POOL
  const occupied = occupiedModTemplateIds(carrier.modSlots)

  return {
    ...carrier,
    modSlots: syncModSlotsForLevel(carrier.modSlots, newLevel, (slotIndex) =>
      generateOffer(pool, tags, occupied, slotIndex, seedBase + slotIndex),
    ),
  }
}
