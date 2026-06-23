import { describe, expect, it } from 'vitest'
import { STARTER_HERO_BASE_STATS } from '../config/baseStats'
import { getCardAttackTemplate } from '../content/cardTemplates'
import { getItemTemplate } from '../content/itemTemplates'
import { aggregateGearStatMult } from '../equipment/aggregates'
import { resolveSkillForCard } from '../skills/resolveSkillForCard'
import { resolveCarrierTags } from '../mods/carrierTags'
import type { CampaignState, CardInstance, Character } from '../types'
import { describeCardCombatStats, getCardDisplayLabel } from './cardText'

const previewCharacter: Pick<Character, 'baseStats' | 'unitLevel' | 'items' | 'equipment'> = {
  baseStats: STARTER_HERO_BASE_STATS,
  unitLevel: 1,
  items: [],
  equipment: { weapon: null, armor: null, accessory: null },
}

describe('getCardDisplayLabel', () => {
  it('returns label for strike', () => {
    expect(getCardDisplayLabel('strike')).toBe('Сильный удар')
  })

  it('falls back to templateId', () => {
    expect(getCardDisplayLabel('unknown_card')).toBe('unknown_card')
  })
})

describe('describeCardCombatStats', () => {
  it('strike damage uses card level and attack stat gear', () => {
    const card: CardInstance = {
      id: 'c1',
      templateId: 'strike',
      global_level: 50,
      uses_count: 0,
      modSlots: [],
    }
    const character = {
      ...previewCharacter,
      items: [
        {
          id: 'w1',
          templateId: 'wooden_sword',
          itemLevel: 10,
          modSlots: [],
        },
      ],
      equipment: { weapon: 'w1', armor: null, accessory: null },
    }
    const tmpl = getCardAttackTemplate('strike')!
    const modCtx = {
      carrierTags: resolveCarrierTags('card', card.templateId),
      modSlots: card.modSlots,
      rng: () => 50,
    }
    const campaign = { worldPower: 0 } as CampaignState
    const expected = resolveSkillForCard(
      campaign,
      character as unknown as Character,
      card,
      tmpl,
      modCtx,
    )!.amount

    const d = describeCardCombatStats(card, character, { worldPower: 0 })
    expect(d.expectedDamage).toBe(expected)
    expect(d.displayLabel).toBe('Сильный удар')
    expect(d.lines.some((l) => l.includes('с экипировкой'))).toBe(true)
    expect(d.lines.some((l) => l.includes('40%%'))).toBe(true)
  })

  it('missing template: no damage', () => {
    const card: CardInstance = {
      id: 'c1',
      templateId: 'nope',
      global_level: 1,
      uses_count: 0,
      modSlots: [],
    }
    const d = describeCardCombatStats(card, previewCharacter, { worldPower: 0 })
    expect(d.expectedDamage).toBeNull()
    expect(d.lines[0]).toContain('не найден')
  })

  it('fireball uses card modSlots for damage preview', () => {
    const card: CardInstance = {
      id: 'c1',
      templateId: 'fireball',
      global_level: 10,
      uses_count: 0,
      modSlots: [{ status: 'filled', templateId: 'mod-damage-up', lm: 0 }],
    }
    const character = {
      ...previewCharacter,
      baseStats: { ...STARTER_HERO_BASE_STATS, magicPower: 5 },
    }
    const tmpl = getCardAttackTemplate('fireball')!
    const modCtx = {
      carrierTags: resolveCarrierTags('card', card.templateId),
      modSlots: card.modSlots,
      rng: () => 50,
    }
    const campaign = { worldPower: 0 } as CampaignState
    const expected = resolveSkillForCard(
      campaign,
      character as unknown as Character,
      card,
      tmpl,
      modCtx,
    )!.amount

    const d = describeCardCombatStats(card, character, { worldPower: 0 })
    expect(d.expectedDamage).toBe(expected)
    expect(d.lines.some((l) => l.includes('Итого:'))).toBe(true)
    expect(
      aggregateGearStatMult('magicPower', character.items, character.equipment, getItemTemplate),
    ).toBe(1)
  })
})
