import { CARD_ATTACK_TEMPLATES } from '../content/cardTemplates'

export type SkillAcquisitionConfig = {
  battleDropChance: number
  shopSkillOfferChance: number
  shopSkillPrice: number
  shopRefreshCost: number
}

export const SKILL_ACQUISITION: SkillAcquisitionConfig = import.meta.env.DEV
  ? {
      battleDropChance: 0.1,
      shopSkillOfferChance: 0.5,
      shopSkillPrice: 100,
      shopRefreshCost: 10,
    }
  : {
      battleDropChance: 0.01,
      shopSkillOfferChance: 0.03,
      shopSkillPrice: 1000,
      shopRefreshCost: 100,
    }

export const SKILL_TEMPLATE_POOL: readonly string[] = Object.keys(
  CARD_ATTACK_TEMPLATES,
).filter((id) => id !== 'strike')

export function rollBattleSkillDrop(
  rngUnit: number,
  cfg: SkillAcquisitionConfig = SKILL_ACQUISITION,
): boolean {
  return rngUnit < cfg.battleDropChance
}

export function rollShopSkillOffer(
  rngUnit: number,
  cfg: SkillAcquisitionConfig = SKILL_ACQUISITION,
): boolean {
  return rngUnit < cfg.shopSkillOfferChance
}

export function pickRandomSkillTemplateId(rng: () => number): string {
  const pool = SKILL_TEMPLATE_POOL
  const idx = Math.floor(rng() * pool.length)
  return pool[Math.min(idx, pool.length - 1)]!
}

/** Цена продажи умения в магазин (50% от shopSkillPrice). */
export function sellPriceForSkill(
  cfg: SkillAcquisitionConfig = SKILL_ACQUISITION,
): number {
  return Math.floor(cfg.shopSkillPrice * 0.5)
}
