import { MOD_OFFER_POOL } from '../content/modTemplates'
import { PASSIVE_MOD_OFFER_POOL } from '../content/passiveModTemplates'
import { getCharacter } from '../character/selectors'
import { resolveCarrierTags } from '../mods/carrierTags'
import { characterHasEffect } from '../specialization/resolve'
import type { CampaignState, CardInstance, ItemInstance, ModSlotState } from '../types'
import { generateOffer } from './modOffers'
import { syncModSlotsForLevel } from './modSlots'

export type ModCarrier = Pick<CardInstance, 'modSlots'> | Pick<ItemInstance, 'modSlots'>

export type MementoOwnerContext = {
  campaign: CampaignState
  characterId: string
}

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

function offerCountForOwner(ctx?: MementoOwnerContext): 3 | 4 {
  if (!ctx) return 3
  return characterHasEffect(ctx.campaign, ctx.characterId, 'mod_offer_plus') ? 4 : 3
}

function ownerCharacter(ctx?: MementoOwnerContext) {
  if (!ctx) return undefined
  return getCharacter(ctx.campaign, ctx.characterId) ?? null
}

export function afterCarrierLevelChange<T extends ModCarrier>(
  carrier: T,
  kind: 'card' | 'item' | 'passive',
  templateId: string,
  newLevel: number,
  seedBase: number,
  ownerContext?: MementoOwnerContext,
): T {
  const tags = resolveCarrierTags(kind, templateId)
  if (tags.length === 0) return carrier

  const pool = kind === 'passive' ? PASSIVE_MOD_OFFER_POOL : MOD_OFFER_POOL
  const occupied = occupiedModTemplateIds(carrier.modSlots)
  const offerCount = offerCountForOwner(ownerContext)
  const owner = ownerCharacter(ownerContext)

  return {
    ...carrier,
    modSlots: syncModSlotsForLevel(
      carrier.modSlots,
      newLevel,
      (slotIndex) =>
        generateOffer(pool, tags, occupied, slotIndex, seedBase + slotIndex, offerCount),
      owner,
    ),
  }
}
