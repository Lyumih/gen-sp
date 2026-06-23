import { describe, expect, it } from 'vitest'
import { CHARACTER_CLASS_IDS } from '../content/characterClasses'
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

  it('includes 8 class entries', () => {
    const classes = codexEntriesByCategory('class')
    expect(classes).toHaveLength(8)
    expect(classes.map((e) => e.id).sort()).toEqual(
      [...CHARACTER_CLASS_IDS]
        .map((id) => codexEntryId('class', id))
        .sort(),
    )
  })

  it('catalog sizes match spec', () => {
    expect(codexEntriesByCategory('class')).toHaveLength(8)
    expect(codexEntriesByCategory('card').length).toBeGreaterThanOrEqual(24)
    expect(codexEntriesByCategory('item').length).toBeGreaterThanOrEqual(27)
  })

  it('includes all five categories', () => {
    const all = allCodexEntries()
    expect(all.some((e) => e.category === 'class')).toBe(true)
    expect(all.some((e) => e.category === 'enemy')).toBe(true)
    expect(all.some((e) => e.category === 'mod')).toBe(true)
    expect(all.length).toBe(
      CHARACTER_CLASS_IDS.length +
        Object.keys(ITEM_TEMPLATES).length +
        Object.keys(CARD_ATTACK_TEMPLATES).length +
        Object.keys(ENEMY_TEMPLATES).length +
        Object.keys(MOD_TEMPLATES).length,
    )
  })
})
