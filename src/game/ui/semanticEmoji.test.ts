import { describe, expect, it } from 'vitest'
import { getSemanticEmoji, SEMANTIC_EMOJI_IDS } from './semanticEmoji'
import { ICON_ACCENT_IDS } from '../character/iconCatalog'

describe('semanticEmoji', () => {
  it('includes heart-heal and heart-blue regen', () => {
    expect(getSemanticEmoji('heart-heal')?.accent).toBe('red')
    expect(getSemanticEmoji('heart-blue')?.accent).toBe('blue')
    expect(getSemanticEmoji('heart-heal')?.base).toBe(getSemanticEmoji('heart-blue')?.base)
  })

  it('every entry uses a valid IconAccentId', () => {
    for (const id of SEMANTIC_EMOJI_IDS) {
      const entry = getSemanticEmoji(id)
      expect(entry).toBeDefined()
      expect(ICON_ACCENT_IDS).toContain(entry!.accent)
    }
  })
})
