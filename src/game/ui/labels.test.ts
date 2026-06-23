import { describe, expect, it } from 'vitest'
import { UI_DNA, UI_GOLD, UI_WORLD_POWER } from './labels'

describe('UI resource labels', () => {
  it('exports gold, world power, and brand dna emoji', () => {
    expect(UI_GOLD).toBe('🪙')
    expect(UI_WORLD_POWER).toBe('⚡')
    expect(UI_DNA).toBe('🧬')
  })
})
