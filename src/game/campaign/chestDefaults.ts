import type { CampaignChest, CampaignState } from '../types'

export const EMPTY_CHEST: CampaignChest = { items: [], unboundCards: [], unboundPassives: [] }

export function withDefaultChestFields(c: CampaignState): CampaignState {
  const chest = c.chest ?? EMPTY_CHEST
  const shopOffers = c.shopOffers === undefined ? null : c.shopOffers
  const shopRefreshSeed = typeof c.shopRefreshSeed === 'number' ? c.shopRefreshSeed : 0
  const pendingHubNotice = c.pendingHubNotice === undefined ? null : c.pendingHubNotice
  if (
    c.chest === chest &&
    c.shopOffers === shopOffers &&
    c.shopRefreshSeed === shopRefreshSeed &&
    c.pendingHubNotice === pendingHubNotice
  ) {
    return c
  }
  return { ...c, chest, shopOffers, shopRefreshSeed, pendingHubNotice }
}
