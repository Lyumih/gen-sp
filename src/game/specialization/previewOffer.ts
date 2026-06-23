import { MOD_OFFER_POOL } from '../content/modTemplates'
import { PASSIVE_MOD_OFFER_POOL } from '../content/passiveModTemplates'
import {
  modOfferSeed,
  occupiedModTemplateIds,
  type ModCarrier,
} from '../memento/carrierLevelChange'
import { generateOffer } from '../memento/modOffers'
import { milestoneThreshold } from '../memento/modSlots'
import { resolveCarrierTags } from '../mods/carrierTags'
import type { CampaignState, Character, ModOffer } from '../types'
import { effectiveMilestoneThreshold, unlockedSlotCountForCharacter } from './milestones'
import { characterHasEffect } from './resolve'

export type PreviewOfferCarrier = ModCarrier & {
  id: string
  templateId: string
  global_level: number
}

export function hasLockedNextModSlot(
  owner: Character | null,
  carrierLevel: number,
  modSlotCount: number,
): boolean {
  const unlocked = unlockedSlotCountForCharacter(owner, carrierLevel, milestoneThreshold)
  if (modSlotCount !== unlocked) return false
  const nextIndex = modSlotCount
  return carrierLevel < effectiveMilestoneThreshold(owner, nextIndex, milestoneThreshold)
}

export function previewOfferForNextSlot(
  campaign: CampaignState,
  ownerId: string,
  owner: Character | null,
  carrierKind: 'card' | 'passive',
  carrier: PreviewOfferCarrier,
): ModOffer | null {
  if (!characterHasEffect(campaign, ownerId, 'mod_offer_preview')) {
    return null
  }

  const tags = resolveCarrierTags(carrierKind, carrier.templateId)
  if (tags.length === 0) return null

  const nextSlotIndex = carrier.modSlots.length
  if (!hasLockedNextModSlot(owner, carrier.global_level, nextSlotIndex)) {
    return null
  }

  const milestone = effectiveMilestoneThreshold(owner, nextSlotIndex, milestoneThreshold)
  const seed = modOfferSeed(carrier.id, nextSlotIndex, milestone)
  const pool = carrierKind === 'passive' ? PASSIVE_MOD_OFFER_POOL : MOD_OFFER_POOL
  const occupied = occupiedModTemplateIds(carrier.modSlots)
  const offerCount = characterHasEffect(campaign, ownerId, 'mod_offer_plus') ? 4 : 3

  return generateOffer(pool, tags, occupied, nextSlotIndex, seed, offerCount)
}
