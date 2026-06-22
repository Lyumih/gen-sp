import type { CampaignState, Character } from '../types'

/** Первый занятый слот отряда или characters[0] — interim для solo-героя до Task 3. */
export function getPrimaryCharacter(campaign: CampaignState): Character {
  const firstSquadId = campaign.squad.find((id): id is string => id !== null)
  if (firstSquadId) {
    const found = campaign.characters.find((c) => c.id === firstSquadId)
    if (found) return found
  }
  const first = campaign.characters[0]
  if (!first) {
    throw new Error('[gen-sp] campaign has no characters')
  }
  return first
}

export function updatePrimaryCharacter(
  campaign: CampaignState,
  update: (character: Character) => Character,
): CampaignState {
  const primary = getPrimaryCharacter(campaign)
  return {
    ...campaign,
    characters: campaign.characters.map((c) =>
      c.id === primary.id ? update(c) : c,
    ),
  }
}
