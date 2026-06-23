import { describe, expect, it } from 'vitest'
import {
  PASSIVE_TEMPLATE_POOL,
  SKILL_TEMPLATE_POOL,
  pickRandomPassiveTemplateId,
  pickRandomSkillTemplateId,
  rollBattlePassiveDrop,
  rollBattleSkillDrop,
  rollShopPassiveOffer,
  rollShopSkillOffer,
  sellPriceForPassive,
  sellPriceForSkill,
} from './skillAcquisition'

const testCfg = {
  battleDropChance: 0.1,
  shopSkillOfferChance: 0.5,
  shopPassiveOfferChance: 0.5,
  shopSkillPrice: 100,
  shopPassivePrice: 100,
  shopRefreshCost: 10,
}

describe('skillAcquisition', () => {
  it('pool excludes strike', () => {
    expect(SKILL_TEMPLATE_POOL).not.toContain('strike')
    expect(SKILL_TEMPLATE_POOL.length).toBeGreaterThan(10)
  })

  it('pickRandomSkillTemplateId never returns strike', () => {
    let i = 0
    const rng = () => (i++ % 97) / 97
    for (let n = 0; n < 50; n++) {
      expect(pickRandomSkillTemplateId(rng)).not.toBe('strike')
    }
  })

  it('rollBattleSkillDrop respects threshold', () => {
    expect(rollBattleSkillDrop(0.09, testCfg)).toBe(true)
    expect(rollBattleSkillDrop(0.11, testCfg)).toBe(false)
  })

  it('rollShopSkillOffer respects threshold', () => {
    expect(rollShopSkillOffer(0.49, testCfg)).toBe(true)
    expect(rollShopSkillOffer(0.51, testCfg)).toBe(false)
  })

  it('rollShopPassiveOffer uses independent threshold', () => {
    expect(rollShopPassiveOffer(0.49, testCfg)).toBe(true)
    expect(rollShopPassiveOffer(0.51, testCfg)).toBe(false)
  })

  it('rollBattlePassiveDrop uses battleDropChance', () => {
    expect(rollBattlePassiveDrop(0.09, testCfg)).toBe(true)
    expect(rollBattlePassiveDrop(0.11, testCfg)).toBe(false)
  })

  it('pickRandomPassiveTemplateId picks from passive pool', () => {
    let i = 0
    const rng = () => (i++ % 97) / 97
    for (let n = 0; n < 50; n++) {
      const id = pickRandomPassiveTemplateId(rng)
      expect(PASSIVE_TEMPLATE_POOL).toContain(id)
    }
  })

  it('sellPriceForSkill is half of shopSkillPrice', () => {
    expect(sellPriceForSkill(testCfg)).toBe(50)
  })

  it('sellPriceForPassive is half of shopPassivePrice', () => {
    expect(sellPriceForPassive(testCfg)).toBe(50)
  })
})
