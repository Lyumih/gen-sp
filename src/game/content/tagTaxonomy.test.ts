import { describe, expect, it } from 'vitest'
import { tagGroup, tagLabelRu } from './tagTaxonomy'

const CLASS_TAGS = [
  'melee',
  'attack',
  'armor',
  'tank',
  'defense',
  'ranged',
  'aoe',
  'skill',
  'magic',
  'mobility',
  'crit',
  'heal',
  'support',
  'regen',
  'resurrect',
  'holy',
  'poison',
  'dark',
  'dot',
  'lifesteal',
  'weapon',
  'accessory',
  'buff',
  'debuff',
  'utility',
] as const

describe('tagTaxonomy', () => {
  it('labels carrier tags in Russian', () => {
    expect(tagLabelRu('melee')).toBe('Ближний бой')
    expect(tagGroup('melee')).toBe('carrier')
  })

  it('labels theme tags in Russian', () => {
    expect(tagLabelRu('holy')).toBe('Святость')
    expect(tagGroup('holy')).toBe('theme')
  })

  it('every class tag from spec has a definition', () => {
    for (const tag of CLASS_TAGS) {
      expect(tagLabelRu(tag)).not.toBe(tag)
    }
  })
})
