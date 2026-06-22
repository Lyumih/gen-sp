import { getCharacter } from '../character/selectors'
import type { CampaignState, CharacterBattleSnapshot, Expedition } from '../types'
import { resolveBattleCount, resolvePartySize, type ExpeditionChainConfig } from './config'

function snapshotCharacter(
  campaign: CampaignState,
  characterId: string,
): CharacterBattleSnapshot | null {
  const character = getCharacter(campaign, characterId)
  if (!character) return null
  return {
    characterId,
    equipment: { ...character.equipment },
    battleLoadout: [...character.battleLoadout],
    metaStatus: 'active',
  }
}

export function buildExpeditionSnapshot(
  campaign: CampaignState,
  chain: ExpeditionChainConfig,
  selectedCharacterIds: readonly string[],
  rng: () => number,
): Expedition {
  const partySize = resolvePartySize(chain.partySize, rng)
  const battleCount = resolveBattleCount(chain.battleCount, rng)
  const squadSnapshot: (CharacterBattleSnapshot | null)[] = []

  for (let i = 0; i < partySize; i++) {
    const characterId = selectedCharacterIds[i]
    squadSnapshot.push(
      characterId === undefined ? null : snapshotCharacter(campaign, characterId),
    )
  }

  return {
    scenarioChainId: chain.id,
    partySize,
    squadSnapshot,
    battleIndex: 0,
    battleCount,
    shopLocked: true,
    ...(chain.interBattleReviveAllDowned
      ? { interBattleReviveAllDowned: true }
      : {}),
  }
}
