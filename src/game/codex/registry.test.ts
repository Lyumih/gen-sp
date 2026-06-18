import { describe, expect, it } from 'vitest'
import { ITEM_TEMPLATES } from '../content/itemTemplates'
import { CARD_ATTACK_TEMPLATES } from '../content/cardTemplates'
import { ENEMY_TEMPLATES } from '../content/enemyTemplates'
import { MOD_TEMPLATES } from '../content/modTemplates'
import { allCodexEntries, codexEntryId, codexEntriesByCategory } from './registry'

describe('codex registry', () => {
  it('maps every item template to a unique entry', () => {
    const items = codexEntriesByCategory('item')
    expect(items).toHaveLength(Object.keys(ITEM_TEMPLATES).length)
    expect(new Set(items.map((e) => e.id)).size).toBe(items.length)
  })

  it('uses category:templateId id format', () => {
    expect(codexEntryId('card', 'strike')).toBe('card:strike')
  })

  it('includes all four categories', () => {
    const all = allCodexEntries()
    expect(all.some((e) => e.category === 'enemy')).toBe(true)
    expect(all.some((e) => e.category === 'mod')).toBe(true)
    expect(all.length).toBe(
      Object.keys(ITEM_TEMPLATES).length +
        Object.keys(CARD_ATTACK_TEMPLATES).length +
        Object.keys(ENEMY_TEMPLATES).length +
        Object.keys(MOD_TEMPLATES).length,
    )
  })
})
