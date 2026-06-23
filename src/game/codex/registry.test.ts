import { describe, expect, it } from 'vitest'
import { CHARACTER_CLASS_IDS } from '../content/characterClasses'
import { ITEM_TEMPLATES } from '../content/itemTemplates'
import { CARD_ATTACK_TEMPLATES } from '../content/cardTemplates'
import { ENEMY_ARCHETYPE_IDS } from '../content/enemyArchetypes'
import { MOD_TEMPLATES } from '../content/modTemplates'
import { PASSIVE_TEMPLATES } from '../content/passiveTemplates'
import { SPECIALIZATION_TEMPLATES } from '../specialization/specializationTemplates'
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

  it('includes passive category with 32 entries after cards', () => {
    const passives = codexEntriesByCategory('passive')
    expect(passives).toHaveLength(32)
    expect(passives).toHaveLength(Object.keys(PASSIVE_TEMPLATES).length)

    const all = allCodexEntries()
    const cardIdx = all.findIndex((e) => e.category === 'card')
    const passiveIdx = all.findIndex((e) => e.category === 'passive')
    const enemyIdx = all.findIndex((e) => e.category === 'enemy')
    expect(cardIdx).toBeGreaterThanOrEqual(0)
    expect(passiveIdx).toBeGreaterThan(cardIdx)
    expect(enemyIdx).toBeGreaterThan(passiveIdx)
  })

  it('includes 27 enemy archetype entries', () => {
    const enemies = codexEntriesByCategory('enemy')
    expect(enemies).toHaveLength(27)
    expect(enemies).toHaveLength(ENEMY_ARCHETYPE_IDS.length)
    expect(new Set(enemies.map((e) => e.id)).size).toBe(enemies.length)
  })

  it('codex includes all specialization affinities', () => {
    const affinities = codexEntriesByCategory('affinity')
    expect(affinities.length).toBe(15)
    expect(affinities).toHaveLength(Object.keys(SPECIALIZATION_TEMPLATES).length)
    expect(new Set(affinities.map((e) => e.id)).size).toBe(affinities.length)
  })

  it('includes all seven categories', () => {
    const all = allCodexEntries()
    expect(all.some((e) => e.category === 'class')).toBe(true)
    expect(all.some((e) => e.category === 'affinity')).toBe(true)
    expect(all.some((e) => e.category === 'enemy')).toBe(true)
    expect(all.some((e) => e.category === 'mod')).toBe(true)
    expect(all.some((e) => e.category === 'passive')).toBe(true)
    expect(all.length).toBe(
      CHARACTER_CLASS_IDS.length +
        Object.keys(SPECIALIZATION_TEMPLATES).length +
        Object.keys(ITEM_TEMPLATES).length +
        Object.keys(CARD_ATTACK_TEMPLATES).length +
        Object.keys(PASSIVE_TEMPLATES).length +
        ENEMY_ARCHETYPE_IDS.length +
        Object.keys(MOD_TEMPLATES).length,
    )
  })
})
