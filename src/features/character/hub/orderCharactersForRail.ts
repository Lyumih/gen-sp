import { getCharacter } from '../../../game/character/selectors'
import type { CampaignState, Character } from '../../../game/types'

/** Squad slot order first, then reserve — for character hub rail. */
export function orderCharactersForRail(campaign: CampaignState): Character[] {
  const squadIds = campaign.squad.filter((id): id is string => id !== null)
  const squadChars = squadIds
    .map((id) => getCharacter(campaign, id))
    .filter((c): c is Character => c !== undefined)
  const squadSet = new Set(squadIds)
  const reserve = campaign.characters.filter((c) => !squadSet.has(c.id))
  return [...squadChars, ...reserve]
}
