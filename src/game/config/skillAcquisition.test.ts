import { describe, expect, it } from 'vitest'
import {
  SKILL_TEMPLATE_POOL,
  pickRandomSkillTemplateId,
  rollBattleSkillDrop,
  rollShopSkillOffer,
  sellPriceForSkill,
} from './skillAcquisition'

const testCfg = {
  battleDropChance: 0.1,
  shopSkillOfferChance: 0.5,
  shopSkillPrice: 100,
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

  it('sellPriceForSkill is half of shopSkillPrice', () => {
    expect(sellPriceForSkill(testCfg)).toBe(50)
  })
})
