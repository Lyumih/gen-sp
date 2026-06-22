import type { CampaignState } from '../types'

export type HubFreezeAction = 'shop' | 'tavern' | 'squad' | 'equip' | 'transfer'

/** Returns true when the hub action is allowed (no active expedition). */
export function assertHubActionAllowed(
  campaign: CampaignState,
  _action: HubFreezeAction,
): boolean {
  return campaign.expedition === null
}
