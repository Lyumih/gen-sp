import { describe, expect, it } from 'vitest'
import { getOccupiedSquadCharacterIds } from './resolveExpeditionParty'
import { shouldOpenPartyPickModal } from './partyPick'

describe('getOccupiedSquadCharacterIds', () => {
  it('returns ids in squad slot order, skipping nulls', () => {
    expect(getOccupiedSquadCharacterIds(['a', null, 'b', null])).toEqual(['a', 'b'])
  })
})

describe('shouldOpenPartyPickModal', () => {
  it('opens when occupied exceeds maxParty', () => {
    expect(shouldOpenPartyPickModal(4, 2)).toBe(true)
    expect(shouldOpenPartyPickModal(2, 2)).toBe(false)
    expect(shouldOpenPartyPickModal(1, 4)).toBe(false)
  })
})
