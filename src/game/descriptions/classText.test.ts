import { describe, expect, it } from 'vitest'
import { describeClassCodex } from './classText'

describe('describeClassCodex', () => {
  it('warrior codex shows tags and primary stats', () => {
    const d = describeClassCodex('warrior')
    expect(d.summaryLines.join(' ')).toMatch(/Ближний|melee/i)
    expect(d.summaryLines.join(' ')).toMatch(/Primary/)
    expect(d.summaryLines.join(' ')).toMatch(/❤️|Здоровье/)
  })

  it('includes class description in detail lines', () => {
    const d = describeClassCodex('mage')
    expect(d.label).toBe('Маг')
    expect(d.detailLines[0]).toMatch(/стихий/i)
  })
})
