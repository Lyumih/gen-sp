import type { CardAttackTemplate } from '../content/cardTemplates'
import { isHealKind } from '../content/cardTemplates'
import { getItemTemplate } from '../content/itemTemplates'
import {
  effectiveStatWithStatuses,
  statusCombatModifiers,
} from '../battle/unitStatus'
import { applyDamageMods, applyHealMods, type ModCombatContext } from '../mods/modPipeline'
import type { CampaignState, CardInstance, Character, Unit } from '../types'
import { computeSkillCore, type SkillCoreResult } from './computeSkillAmount'

export type ResolvedSkillAmount = {
  amount: number
  core: SkillCoreResult
  effectPower: number
}

function battleBaseStats(character: Character, actor: Unit | undefined): Character['baseStats'] {
  const base = actor?.baseStats ?? character.baseStats
  if (!actor) return base
  return {
    ...base,
    attack: effectiveStatWithStatuses(base.attack, 'attack', actor),
    defense: effectiveStatWithStatuses(base.defense, 'defense', actor),
    healPower: effectiveStatWithStatuses(base.healPower, 'healPower', actor),
    magicPower: effectiveStatWithStatuses(base.magicPower, 'magicPower', actor),
  }
}

export function resolveSkillForCard(
  campaign: CampaignState,
  character: Character,
  card: CardInstance,
  tmpl: CardAttackTemplate,
  modCtx: ModCombatContext,
  actor?: Unit,
): ResolvedSkillAmount | null {
  const coreResult = computeSkillCore({
    character: {
      baseStats: battleBaseStats(character, actor),
      unitLevel: character.unitLevel,
      items: character.items,
      equipment: character.equipment,
    },
    campaign: { worldPower: campaign.worldPower },
    statSource: tmpl.statSource,
    skillFlat: tmpl.skillFlat,
    scaleToken: tmpl.scaleToken,
    cardLevel: card.global_level,
    getItemTemplate,
  })
  if (coreResult === null) return null

  const statusMods = actor ? statusCombatModifiers(actor) : { cardDamageMult: 1 }
  const scaled = Math.round(coreResult.amountBeforeMods * statusMods.cardDamageMult)
  const effectKind = isHealKind(tmpl.kind) ? 'heal' : 'damage'
  const amount =
    effectKind === 'heal' ? applyHealMods(scaled, modCtx) : applyDamageMods(scaled, modCtx)

  return {
    amount,
    effectPower: scaled,
    core: { ...coreResult, amountBeforeMods: scaled },
  }
}
