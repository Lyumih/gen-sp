import type { CampaignState, Expedition } from '../types'
import { getExpeditionChainById } from '../expedition/config'
import type { MilestoneId } from './types'

function hasFirstMod(campaign: CampaignState): boolean {
  for (const character of campaign.characters) {
    for (const card of character.cards) {
      if (card.modSlots.length === 0) continue
      if (card.modSlots.some((slot) => slot.status === 'filled' && slot.lm > 0)) {
        return true
      }
    }
  }
  return false
}

export function evaluateMilestones(campaign: CampaignState): readonly MilestoneId[] {
  const result: MilestoneId[] = []

  if (campaign.worldPower >= 10) {
    result.push('milestone_world_power_10')
  }
  if (campaign.characters.length >= 2) {
    result.push('milestone_hire_second')
  }
  if (hasFirstMod(campaign)) {
    result.push('milestone_first_mod')
  }

  return result
}

export function victoryExpeditionMilestones(
  expedition: Expedition | null,
): readonly MilestoneId[] {
  if (!expedition) return []

  const result: MilestoneId[] = []
  const chain = getExpeditionChainById(expedition.scenarioChainId)

  if (chain?.kind === 'procedural') {
    result.push('milestone_first_trial_win')
  }
  if (expedition.scenarioChainId === 'big-arena') {
    result.push('milestone_big_arena_win')
  }

  return result
}

export function syncCompletedMilestones(
  campaign: CampaignState,
  extra: readonly MilestoneId[] = [],
): CampaignState {
  const evaluated = [...evaluateMilestones(campaign), ...extra]
  const merged = [...new Set([...campaign.completedMilestones, ...evaluated])]
  if (merged.length === campaign.completedMilestones.length) return campaign
  return { ...campaign, completedMilestones: merged }
}
