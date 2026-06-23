import type { CardAttackTemplate } from '../content/cardTemplates'
import { getItemTemplate } from '../content/itemTemplates'
import { applyDamageMods } from '../mods/modPipeline'
import { computeSkillCore } from '../skills/computeSkillAmount'
import type { BattlePlayerCard, Unit } from '../types'

export function resolveEnemySkillAmount(
  actor: Unit,
  card: BattlePlayerCard,
  tmpl: CardAttackTemplate,
  worldPower: number,
): number | null {
  if (!actor.baseStats) return null
  const core = computeSkillCore({
    character: {
      baseStats: actor.baseStats,
      unitLevel: actor.unitLevel,
      items: [],
      equipment: { weapon: null, armor: null, accessory: null },
    },
    campaign: { worldPower },
    statSource: tmpl.statSource,
    skillFlat: tmpl.skillFlat,
    scaleToken: tmpl.scaleToken,
    cardLevel: card.global_level,
    getItemTemplate,
  })
  if (!core) return null
  return applyDamageMods(core.amountBeforeMods, {
    carrierTags: [],
    modSlots: card.modSlots,
    rng: () => 50,
  })
}

export function resolveEnemySkillEffectPower(
  actor: Unit,
  card: BattlePlayerCard,
  tmpl: CardAttackTemplate,
  worldPower: number,
): number | null {
  if (!actor.baseStats) return null
  const core = computeSkillCore({
    character: {
      baseStats: actor.baseStats,
      unitLevel: actor.unitLevel,
      items: [],
      equipment: { weapon: null, armor: null, accessory: null },
    },
    campaign: { worldPower },
    statSource: tmpl.statSource,
    skillFlat: tmpl.skillFlat,
    scaleToken: tmpl.scaleToken,
    cardLevel: card.global_level,
    getItemTemplate,
  })
  return core?.amountBeforeMods ?? null
}
