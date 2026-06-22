import { describe, expect, it } from 'vitest'
import { CHARACTER_CLASS_IDS } from '../content/characterClasses'
import { EQUIPMENT_ROLL_ORDER } from '../equipment/equipmentOrder'
import {
  generateTavernCandidates,
  seededRng,
  TAVERN_CANDIDATE_COUNT,
} from './generateCandidates'

describe('generateTavernCandidates', () => {
  it('generates 3 candidates by default', () => {
    const rng = seededRng(42)
    const candidates = generateTavernCandidates(rng)
    expect(candidates).toHaveLength(TAVERN_CANDIDATE_COUNT)
  })

  it('each candidate has classId, price, and preview gear per slot', () => {
    const rng = seededRng(7)
    const candidates = generateTavernCandidates(rng)
    for (const c of candidates) {
      expect(c.candidateId).toBeTruthy()
      expect(CHARACTER_CLASS_IDS).toContain(c.classId)
      expect(c.price).toBeGreaterThan(0)
      for (const slot of EQUIPMENT_ROLL_ORDER) {
        expect(typeof c.previewGear[slot]).toBe('string')
      }
    }
  })

  it('is deterministic with the same seeded rng', () => {
    const a = generateTavernCandidates(seededRng(99))
    const b = generateTavernCandidates(seededRng(99))
    expect(a.map((c) => ({ classId: c.classId, price: c.price, previewGear: c.previewGear }))).toEqual(
      b.map((c) => ({ classId: c.classId, price: c.price, previewGear: c.previewGear })),
    )
  })
})
