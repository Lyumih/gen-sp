import { describe, expect, it } from 'vitest'
import { createPassiveInstance } from './passiveFactory'

describe('createPassiveInstance', () => {
  it('creates level-1 passive with empty mod slots', () => {
    const p = createPassiveInstance('warrior_fortitude')
    expect(p.templateId).toBe('warrior_fortitude')
    expect(p.global_level).toBe(1)
    expect(p.uses_count).toBe(0)
    expect(p.modSlots).toEqual([])
    expect(p.id.length).toBeGreaterThan(0)
  })
})
