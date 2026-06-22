import { describe, expect, it } from 'vitest'
import { initialCampaignState } from '../campaign/runReducer'
import { LEGACY_HERO_CHARACTER_ID } from './constants'
import { createCharacter } from './createCharacter'
import {
  findFirstEmptySquadSlotIndex,
  findSquadSlotIndex,
  getActiveCharacter,
  getCharacter,
  getReserveCharacters,
  getSquadCharacters,
  hasEmptySquadSlot,
} from './selectors'

function campaignWithTwoCharacters() {
  const base = initialCampaignState()
  const reserve = createCharacter({
    id: 'char-2',
    name: 'Reserve',
    classId: 'mage',
    initiativeBase: 8,
  })
  return {
    ...base,
    characters: [...base.characters, reserve],
    squad: [LEGACY_HERO_CHARACTER_ID, null, null, null],
  }
}

describe('character selectors', () => {
  it('getCharacter returns character by id', () => {
    const c = campaignWithTwoCharacters()
    expect(getCharacter(c, 'char-2')?.name).toBe('Reserve')
    expect(getCharacter(c, 'missing')).toBeUndefined()
  })

  it('getSquadCharacters returns squad in slot order', () => {
    const c = campaignWithTwoCharacters()
    expect(getSquadCharacters(c).map((x) => x.id)).toEqual([LEGACY_HERO_CHARACTER_ID])
  })

  it('getReserveCharacters excludes squad ids', () => {
    const c = campaignWithTwoCharacters()
    expect(getReserveCharacters(c).map((x) => x.id)).toEqual(['char-2'])
  })

  it('getActiveCharacter returns first squad slot', () => {
    const c = campaignWithTwoCharacters()
    expect(getActiveCharacter(c).id).toBe(LEGACY_HERO_CHARACTER_ID)
  })

  it('squad slot helpers', () => {
    const squad = [LEGACY_HERO_CHARACTER_ID, null, 'char-2', null] as const
    expect(hasEmptySquadSlot(squad)).toBe(true)
    expect(findFirstEmptySquadSlotIndex(squad)).toBe(1)
    expect(findSquadSlotIndex(squad, 'char-2')).toBe(2)
    expect(findSquadSlotIndex(squad, 'missing')).toBeNull()

    const full = ['a', 'b', 'c', 'd'] as const
    expect(hasEmptySquadSlot(full)).toBe(false)
    expect(findFirstEmptySquadSlotIndex(full)).toBeNull()
  })
})
