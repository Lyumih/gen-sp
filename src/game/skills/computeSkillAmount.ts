import { computeUnitStat } from '../balance'
import type { BaseStats, StatId } from '../config/baseStats'
import type { ItemTemplate } from '../content/itemTemplates'
import { aggregateGearStatMult } from '../equipment/aggregates'
import {
  applyDamageMods,
  applyHealMods,
  type ModCombatContext,
} from '../mods/modPipeline'
import type { EquipmentSlot, ItemInstance } from '../types'
import { parseSkillScalePercent, skillLevelMult } from './skillLevelMult'

export type SkillCharacter = {
  baseStats: BaseStats
  unitLevel: number
  items: readonly ItemInstance[]
  equipment: Record<EquipmentSlot, string | null>
}

export type SkillCampaign = {
  worldPower: number
}

export function computeEffectiveStatForSkill(
  character: SkillCharacter,
  campaign: SkillCampaign,
  statId: StatId,
  getItemTemplate: (id: string) => ItemTemplate | undefined,
): number {
  const stat0 = computeUnitStat({
    baseStat: character.baseStats[statId],
    unitLevel: character.unitLevel,
    worldPower: campaign.worldPower,
  })
  const gearMult = aggregateGearStatMult(
    statId,
    character.items,
    character.equipment,
    getItemTemplate,
  )
  return Math.round(stat0 * gearMult)
}

export type SkillCoreInput = {
  character: SkillCharacter
  campaign: SkillCampaign
  statSource: StatId
  skillFlat: number
  scaleToken: string
  cardLevel: number
  getItemTemplate: (id: string) => ItemTemplate | undefined
}

export type SkillCoreResult = {
  stat0: number
  stat1: number
  core: number
  skillMult: number
  amountBeforeMods: number
}

export function computeSkillCore(input: SkillCoreInput): SkillCoreResult | null {
  const stat0 = computeUnitStat({
    baseStat: input.character.baseStats[input.statSource],
    unitLevel: input.character.unitLevel,
    worldPower: input.campaign.worldPower,
  })
  const gearMult = aggregateGearStatMult(
    input.statSource,
    input.character.items,
    input.character.equipment,
    input.getItemTemplate,
  )
  const stat1 = Math.round(stat0 * gearMult)
  const core = stat1 + input.skillFlat
  const scalePercent = parseSkillScalePercent(input.scaleToken)
  if (scalePercent === null) return null
  const skillMultValue = skillLevelMult(input.cardLevel, scalePercent)
  const amountBeforeMods = Math.round(core * skillMultValue)
  return {
    stat0,
    stat1,
    core,
    skillMult: skillMultValue,
    amountBeforeMods,
  }
}

export type SkillAmountContext = SkillCoreInput & {
  modCtx: ModCombatContext
  effectKind: 'damage' | 'heal'
}

export function computeSkillAmount(ctx: SkillAmountContext): number | null {
  const coreResult = computeSkillCore(ctx)
  if (coreResult === null) return null
  if (ctx.effectKind === 'heal') {
    return applyHealMods(coreResult.amountBeforeMods, ctx.modCtx)
  }
  return applyDamageMods(coreResult.amountBeforeMods, ctx.modCtx)
}
