import { describe, expect, it } from 'vitest'
import { parseSkillScalePercent, skillLevelMult } from './skillLevelMult'

describe('parseSkillScalePercent', () => {
  it('extracts P from plain %% token', () => {
    expect(parseSkillScalePercent('40%%')).toBe(40)
    expect(parseSkillScalePercent(' 25%% ')).toBe(25)
  })

  it('returns null for non-plain tokens', () => {
    expect(parseSkillScalePercent('40%%50')).toBeNull()
    expect(parseSkillScalePercent('40%%-10')).toBeNull()
    expect(parseSkillScalePercent('')).toBeNull()
  })
})

describe('skillLevelMult', () => {
  const table: { L: number; P: number; expected: number }[] = [
    { L: 0, P: 25, expected: 1.0 },
    { L: 0, P: 40, expected: 1.0 },
    { L: 0, P: 50, expected: 1.0 },
    { L: 0, P: 60, expected: 1.0 },
    { L: 50, P: 25, expected: 1.125 },
    { L: 50, P: 40, expected: 1.2 },
    { L: 50, P: 50, expected: 1.25 },
    { L: 50, P: 60, expected: 1.3 },
    { L: 100, P: 25, expected: 1.25 },
    { L: 100, P: 40, expected: 1.4 },
    { L: 100, P: 50, expected: 1.5 },
    { L: 100, P: 60, expected: 1.6 },
  ]

  it.each(table)('L=$L P=$P → $expected', ({ L, P, expected }) => {
    expect(skillLevelMult(L, P)).toBeCloseTo(expected, 10)
  })

  it('caps card level at 100', () => {
    expect(skillLevelMult(150, 40)).toBeCloseTo(skillLevelMult(100, 40), 10)
  })
})
