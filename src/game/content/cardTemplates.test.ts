import { describe, expect, it } from 'vitest'
import { CARD_ATTACK_TEMPLATES } from './cardTemplates'

const PHASE2_KINDS = new Set([
  'regen',
  'resurrect',
  'buff',
  'debuff',
  'dot',
  'lifesteal_spell',
  'utility',
])

describe('CARD_ATTACK_TEMPLATES', () => {
  it('has at least 24 skill templates (excluding strike action channel)', () => {
    const ids = Object.keys(CARD_ATTACK_TEMPLATES)
    expect(ids.length).toBeGreaterThanOrEqual(24)
    expect(ids).toContain('strike')
  })

  it('phase-2 kinds are disabled', () => {
    expect(CARD_ATTACK_TEMPLATES.regeneration.enabled).toBe(false)
    expect(CARD_ATTACK_TEMPLATES.battle_cry.enabled).toBe(false)
    expect(CARD_ATTACK_TEMPLATES.fireball.enabled).not.toBe(false)
    expect(CARD_ATTACK_TEMPLATES.heal.enabled).not.toBe(false)

    for (const [id, tmpl] of Object.entries(CARD_ATTACK_TEMPLATES)) {
      if (id === 'strike') continue
      if (PHASE2_KINDS.has(tmpl.kind)) {
        expect(tmpl.enabled, `${id} kind=${tmpl.kind}`).toBe(false)
      }
    }
  })

  it('every template has tags and semanticEmojiId', () => {
    for (const tmpl of Object.values(CARD_ATTACK_TEMPLATES)) {
      expect(tmpl.tags.length).toBeGreaterThan(0)
      expect(tmpl.semanticEmojiId).toBeTruthy()
    }
  })
})
