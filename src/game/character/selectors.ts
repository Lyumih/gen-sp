import type { CampaignState, Character } from '../types'

export function getCharacter(campaign: CampaignState, id: string): Character | undefined {
  return campaign.characters.find((c) => c.id === id)
}

export function getSquadCharacters(campaign: CampaignState): Character[] {
  return campaign.squad
    .map((id) => (id !== null ? getCharacter(campaign, id) : undefined))
    .filter((c): c is Character => c !== undefined)
}

export function getReserveCharacters(campaign: CampaignState): Character[] {
  const squadIds = new Set(
    campaign.squad.filter((id): id is string => id !== null),
  )
  return campaign.characters.filter((c) => !squadIds.has(c.id))
}

export function hasEmptySquadSlot(squad: readonly (string | null)[]): boolean {
  return squad.some((id) => id === null)
}

export function findFirstEmptySquadSlotIndex(squad: readonly (string | null)[]): number | null {
  const idx = squad.findIndex((id) => id === null)
  return idx >= 0 ? idx : null
}

export function findSquadSlotIndex(
  squad: readonly (string | null)[],
  characterId: string,
): number | null {
  const idx = squad.indexOf(characterId)
  return idx >= 0 ? idx : null
}

/** Первый занятый слот отряда или characters[0] — для UI и solo-совместимости. */
export function getActiveCharacter(campaign: CampaignState): Character {
  const firstSquadId = campaign.squad.find((id): id is string => id !== null)
  if (firstSquadId) {
    const found = getCharacter(campaign, firstSquadId)
    if (found) return found
  }
  const first = campaign.characters[0]
  if (!first) {
    throw new Error('[gen-sp] campaign has no characters')
  }
  return first
}

/** @deprecated use getActiveCharacter */
export function getPrimaryCharacter(campaign: CampaignState): Character {
  return getActiveCharacter(campaign)
}

export function updateCharacter(
  campaign: CampaignState,
  characterId: string,
  update: (character: Character) => Character,
): CampaignState {
  if (!getCharacter(campaign, characterId)) return campaign
  return {
    ...campaign,
    characters: campaign.characters.map((c) =>
      c.id === characterId ? update(c) : c,
    ),
  }
}

export function updatePrimaryCharacter(
  campaign: CampaignState,
  update: (character: Character) => Character,
): CampaignState {
  return updateCharacter(campaign, getPrimaryCharacter(campaign).id, update)
}
