import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../campaign/runReducer'
import { createCharacter } from '../character/createCharacter'
import { STARTER_HERO_BASE_STATS } from '../config/baseStats'
import { computeBaseStatRating } from '../stats/computeRating'
import { afterCarrierLevelChange, modOfferSeed } from '../memento/carrierLevelChange'
import { generateOffer } from '../memento/modOffers'
import { milestoneThreshold } from '../memento/modSlots'
import { MOD_OFFER_POOL } from '../content/modTemplates'
import { resolveCarrierTags } from '../mods/carrierTags'
import type { ModSlotState } from '../types'
import {
  hasLockedNextModSlot,
  previewOfferForNextSlot,
} from './previewOffer'

function char(id: string, spec: string | null) {
  return {
    ...createCharacter({
      id,
      name: id,
      classId: 'warrior',
      baseStats: STARTER_HERO_BASE_STATS,
      baseStatRating: computeBaseStatRating(STARTER_HERO_BASE_STATS),
    }),
    specializationId: spec,
  }
}

function campaignWithOwner(owner: ReturnType<typeof char>) {
  return {
    ...initialCampaignState(),
    characters: [owner],
    squad: [owner.id, null, null, null],
  }
}

describe('hasLockedNextModSlot', () => {
  it('true when level below next slot milestone', () => {
    expect(hasLockedNextModSlot(null, 3, 0)).toBe(true)
  })

  it('false when carrier level already unlocked the next slot count', () => {
    const level = milestoneThreshold(1)
    expect(hasLockedNextModSlot(null, level, 1)).toBe(false)
  })
})

describe('previewOfferForNextSlot', () => {
  it('returns null without mod_offer_preview', () => {
    const owner = char('hero', 'meta_drop_skill')
    const campaign = campaignWithOwner(owner)
    const carrier = {
      id: 'card-1',
      templateId: 'fireball',
      global_level: 3,
      modSlots: [] as ModSlotState[],
    }
    expect(
      previewOfferForNextSlot(campaign, owner.id, owner, 'card', carrier),
    ).toBeNull()
  })

  it('previewOfferForNextSlot matches generateOffer at milestone', () => {
    const owner = char('hero', 'mod_offer_preview')
    const campaign = campaignWithOwner(owner)
    const carrierId = 'card-fireball-1'
    const templateId = 'fireball'
    const nextSlotIndex = 0
    const carrierLevel = milestoneThreshold(nextSlotIndex) - 1
    const carrier = {
      id: carrierId,
      templateId,
      global_level: carrierLevel,
      modSlots: [] as ModSlotState[],
    }

    const preview = previewOfferForNextSlot(campaign, owner.id, owner, 'card', carrier)
    expect(preview).not.toBeNull()

    const tags = resolveCarrierTags('card', templateId)
    const milestone = milestoneThreshold(nextSlotIndex)
    const seed = modOfferSeed(carrierId, nextSlotIndex, milestone)
    const expected = generateOffer(MOD_OFFER_POOL, tags, [], nextSlotIndex, seed)

    expect(preview!.modIds).toEqual(expected.modIds)
    expect(preview!.rollSeed).toBe(expected.rollSeed)
  })

  it('matches afterCarrierLevelChange offer when first slot unlocks', () => {
    const owner = char('hero', 'mod_offer_preview')
    const campaign = campaignWithOwner(owner)
    const carrierId = 'card-fireball-2'
    const templateId = 'fireball'
    const unlockLevel = milestoneThreshold(0)
    const carrier = {
      id: carrierId,
      templateId,
      global_level: unlockLevel - 1,
      modSlots: [] as ModSlotState[],
    }

    const preview = previewOfferForNextSlot(campaign, owner.id, owner, 'card', carrier)
    const unlocked = afterCarrierLevelChange(
      { modSlots: carrier.modSlots },
      'card',
      templateId,
      unlockLevel,
      modOfferSeed(carrierId, 0, unlockLevel),
      { campaign, characterId: owner.id },
    )
    const slot = unlocked.modSlots[0]
    expect(slot?.status).toBe('empty')
    if (slot?.status !== 'empty' || !slot.offer) return

    expect(preview!.modIds).toEqual(slot.offer.modIds)
  })

  it('returns 3 mod ids by default', () => {
    const owner = char('hero', 'mod_offer_preview')
    const campaign = campaignWithOwner(owner)
    const carrier = {
      id: 'card-heal-1',
      templateId: 'heal',
      global_level: 1,
      modSlots: [] as ModSlotState[],
    }

    const preview = previewOfferForNextSlot(campaign, owner.id, owner, 'card', carrier)
    expect(preview?.modIds).toHaveLength(3)
  })
})
