import { describe, expect, it } from 'vitest'
import { getSemanticEmoji } from '../ui/semanticEmoji'
import { ITEM_TEMPLATES } from './itemTemplates'

describe('ITEM_TEMPLATES', () => {
  it('has 27 items (24 archetypes + 3 budget)', () => {
    expect(Object.keys(ITEM_TEMPLATES)).toHaveLength(27)
  })

  it('every item semanticEmojiId resolves via getSemanticEmoji', () => {
    for (const [id, tmpl] of Object.entries(ITEM_TEMPLATES)) {
      expect(getSemanticEmoji(tmpl.semanticEmojiId), `${id} → ${tmpl.semanticEmojiId}`).toBeDefined()
    }
  })

  it('budget items have carrier tags', () => {
    expect(ITEM_TEMPLATES.wooden_sword.tags).toEqual(['weapon', 'attack', 'melee'])
    expect(ITEM_TEMPLATES.leather_armor.tags).toEqual(['armor', 'defense'])
    expect(ITEM_TEMPLATES.copper_ring.tags).toEqual(['accessory'])
  })
})
