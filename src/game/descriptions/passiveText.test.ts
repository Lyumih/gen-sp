import { describe, expect, it } from 'vitest'
import { STARTER_HERO_BASE_STATS } from '../config/baseStats'
import { createPassiveInstance } from '../passives/passiveFactory'
import type { CampaignState, Character } from '../types'
import { UI_LEVEL } from '../ui/labels'
import { describePassiveStats, getPassiveDisplayLabel } from './passiveText'

const previewCharacter: Pick<Character, 'baseStats' | 'unitLevel' | 'items' | 'equipment'> = {
  baseStats: STARTER_HERO_BASE_STATS,
  unitLevel: 1,
  items: [],
  equipment: { weapon: null, armor: null, accessory: null },
}

const campaign: Pick<CampaignState, 'worldPower'> = { worldPower: 0 }

describe('getPassiveDisplayLabel', () => {
  it('returns template label', () => {
    expect(getPassiveDisplayLabel('warrior_fortitude')).toBe('Стойкость')
  })

  it('falls back to templateId', () => {
    expect(getPassiveDisplayLabel('unknown_passive')).toBe('unknown_passive')
  })
})

describe('describePassiveStats', () => {
  it('includes trigger and flat bonus at L and L=100 preview', () => {
    const passive = createPassiveInstance('warrior_fortitude')
    const d = describePassiveStats(passive, previewCharacter, campaign)
    expect(d.displayLabel).toBe('Стойкость')
    expect(d.lines.some((line) => line.includes('При получении урона'))).toBe(true)
    expect(d.lines.some((line) => line.includes('🛡') && line.includes('+2'))).toBe(true)
    expect(d.lines.some((line) => line.includes(`${UI_LEVEL}100`) && line.includes('+3'))).toBe(
      true,
    )
  })

  it('includes pct bonus scaled from character base stat', () => {
    const passive = { ...createPassiveInstance('warrior_vigor'), global_level: 1 }
    const d = describePassiveStats(passive, previewCharacter, campaign)
    expect(d.lines.some((line) => line.includes('❤️') && line.includes('+3'))).toBe(true)
    expect(d.lines.some((line) => line.includes(`${UI_LEVEL}100`) && line.includes('+5'))).toBe(
      true,
    )
  })

  it('includes proc description for proc passives', () => {
    const passive = createPassiveInstance('warrior_riposte')
    const d = describePassiveStats(passive, previewCharacter, campaign)
    expect(d.lines.some((line) => line.includes('20%'))).toBe(true)
    expect(d.lines.some((line) => line.includes('При получении урона'))).toBe(true)
  })
})
