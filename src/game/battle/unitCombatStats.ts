import { getItemTemplate } from '../content/itemTemplates'
import { aggregatePassiveSkillStatBonuses } from '../passives/passiveStatBonuses'
import { computeEffectiveStats, computeGearStatBonuses } from '../stats/effectiveStats'
import type { CampaignState, Unit } from '../types'
import { effectiveStatWithStatuses } from './unitStatus'

export function unitCombatMiniStats(
  unit: Unit,
  campaign: CampaignState,
  worldPower: number,
): { attack: number; defense: number } | null {
  if (!unit.baseStats) return null
  const character = campaign.characters.find((c) => c.id === unit.id)
  const gearBonuses = character
    ? computeGearStatBonuses(character.items, character.equipment, getItemTemplate)
    : {}
  const passiveBonuses = character
    ? aggregatePassiveSkillStatBonuses(character.passives, character.passiveEquip, unit.baseStats)
    : {}
  const effective = computeEffectiveStats(
    unit.baseStats,
    unit.unitLevel,
    worldPower,
    gearBonuses,
    passiveBonuses,
  )
  return {
    attack: effectiveStatWithStatuses(effective.attack, 'attack', unit),
    defense: effectiveStatWithStatuses(effective.defense, 'defense', unit),
  }
}
