import { describe, expect, it } from 'vitest'
import { getItemTemplate } from '../../game/content/itemTemplates'
import { getCardAttackTemplate } from '../../game/content/cardTemplates'
import { resolveCardEmoji, resolveItemEmoji } from './inventoryEmoji'

describe('resolveItemEmoji', () => {
  it('uses template emoji when set', () => {
    const t = getItemTemplate('wooden_sword')!
    expect(resolveItemEmoji(t, 'weapon')).toBe('🗡️')
  })

  it('falls back to slot default', () => {
    expect(resolveItemEmoji(undefined, 'armor')).toBe('🛡️')
  })
})

describe('resolveCardEmoji', () => {
  it('uses template emoji when set', () => {
    const t = getCardAttackTemplate('strike')!
    expect(resolveCardEmoji(t)).toBe('🃏')
  })

  it('falls back to card default', () => {
    expect(resolveCardEmoji(undefined)).toBe('🃏')
  })
})
