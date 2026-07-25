import type { CampaignState, Unit } from '../types'
import { unitBattleEffectiveStats } from './unitBattleEffectiveStats'
import { effectiveStatWithStatuses } from './unitStatus'

export function unitCombatMiniStats(
  unit: Unit,
  campaign: CampaignState,
  _worldPower: number,
): { attack: number; defense: number } | null {
  const battle = campaign.battle
  if (!battle) return null
  const pair = unitBattleEffectiveStats(battle, unit, campaign)
  if (!pair) return null
  return {
    attack: effectiveStatWithStatuses(pair.effective.attack, 'attack', unit),
    defense: effectiveStatWithStatuses(pair.effective.defense, 'defense', unit),
  }
}
