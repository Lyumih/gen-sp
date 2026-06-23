import { describe, expect, it } from 'vitest'
import type { BaseStats } from '../config/baseStats'
import type { ItemTemplate } from '../content/itemTemplates'
import { EMPTY_EQUIPMENT } from '../equipment/equipmentOrder'
import type { ItemInstance } from '../types'
import {
  computeEffectiveStatForSkill,
  computeSkillAmount,
  computeSkillCore,
  type SkillCharacter,
  type SkillCampaign,
} from './computeSkillAmount'

function baseStats(healPower: number): BaseStats {
  return {
    health: 20,
    defense: 2,
    attack: 3,
    magicPower: 1,
    mana: 10,
    healPower,
    speed: 2,
    initiative: 8,
    critChance: 5,
  }
}

function tmpl(p: Partial<ItemTemplate> & Pick<ItemTemplate, 'id' | 'slot'>): ItemTemplate {
  return {
    shopPrice: 1,
    hpPctPerLevel: 0,
    damagePctPerLevel: 0,
    label: p.id,
    tags: [],
    semanticEmojiId: 'ring-gold',
    ...p,
  }
}

describe('computeSkillCore heal example (spec §3.4)', () => {
  const campaign: SkillCampaign = { worldPower: 0 }
  const healItem: ItemInstance = {
    id: 'ring1',
    templateId: 'heal_ring',
    itemLevel: 1,
    modSlots: [],
  }
  const equipment = { ...EMPTY_EQUIPMENT, accessory: 'ring1' }
  const catalog: Record<string, ItemTemplate> = {
    heal_ring: tmpl({
      id: 'heal_ring',
      slot: 'accessory',
      statPctPerLevel: { healPower: 100 },
    }),
  }
  const getItemTemplate = (id: string) => catalog[id]

  const character: SkillCharacter = {
    baseStats: baseStats(3),
    unitLevel: 0,
    items: [healItem],
    equipment,
  }

  it('computes stat0 → stat1 → core → amountBeforeMods', () => {
    expect(
      computeEffectiveStatForSkill(character, campaign, 'healPower', getItemTemplate),
    ).toBe(6)

    const core = computeSkillCore({
      character,
      campaign,
      statSource: 'healPower',
      skillFlat: 5,
      scaleToken: '40%%',
      cardLevel: 100,
      getItemTemplate,
    })

    expect(core).toEqual({
      stat0: 3,
      stat1: 6,
      core: 11,
      skillMult: 1.4,
      amountBeforeMods: 15,
    })
  })

  it('computeSkillAmount applies heal mods after skill scaling', () => {
    const amount = computeSkillAmount({
      character,
      campaign,
      statSource: 'healPower',
      skillFlat: 5,
      scaleToken: '40%%',
      cardLevel: 100,
      getItemTemplate,
      effectKind: 'heal',
      modCtx: { modSlots: [], carrierTags: [], rng: () => 50 },
    })

    expect(amount).toBe(15)
  })
})
