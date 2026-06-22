import { getCharacter } from '../character/selectors'
import type {
  BattleAttemptSnapshot,
  BattleLoadout,
  CampaignState,
  Character,
  CharacterMetaStatus,
  Expedition,
  ItemInstance,
  PartyMemberBattleSnapshot,
} from '../types'
import { getPrimaryCharacter } from './selectors'

export function cloneCards(
  cards: readonly PartyMemberBattleSnapshot['cards'][number][],
): PartyMemberBattleSnapshot['cards'] {
  return cards.map((c) => ({
    ...c,
    modifications: c.modifications.map((m) => ({ ...m })),
  }))
}

export function cloneItems(items: readonly ItemInstance[]): ItemInstance[] {
  return items.map((i) => ({ ...i }))
}

export function partyMemberFromCharacter(
  character: Character,
  spawnIndex: number,
  metaStatus: CharacterMetaStatus = 'active',
): PartyMemberBattleSnapshot {
  return {
    characterId: character.id,
    unitLevel: character.unitLevel,
    baseStats: { ...character.baseStats },
    items: cloneItems(character.items),
    equipment: { ...character.equipment },
    cards: cloneCards(character.cards),
    battleLoadout: [...character.battleLoadout] as BattleLoadout,
    metaStatus,
    spawnIndex,
  }
}

export function clonePartyMember(member: PartyMemberBattleSnapshot): PartyMemberBattleSnapshot {
  return {
    characterId: member.characterId,
    unitLevel: member.unitLevel,
    baseStats: { ...member.baseStats },
    items: cloneItems(member.items),
    equipment: { ...member.equipment },
    cards: cloneCards(member.cards),
    battleLoadout: [...member.battleLoadout] as BattleLoadout,
    metaStatus: member.metaStatus,
    spawnIndex: member.spawnIndex,
  }
}

export function buildBattleAttemptSnapshot(
  state: CampaignState,
  scenarioSlotIndex: number,
): BattleAttemptSnapshot {
  const party: PartyMemberBattleSnapshot[] = []
  state.squad.forEach((id, spawnIndex) => {
    if (id === null) return
    const character = getCharacter(state, id)
    if (!character) return
    party.push(partyMemberFromCharacter(character, spawnIndex, 'active'))
  })

  if (party.length === 0) {
    party.push(partyMemberFromCharacter(getPrimaryCharacter(state), 0, 'active'))
  }

  return {
    worldPower: state.worldPower,
    modKillTargetCardId: state.modKillTargetCardId,
    scenarioSlotIndex,
    gold: state.gold,
    party,
  }
}

/** First active squad member; downed members are skipped until revived. */
export function getExpeditionBattleCharacterId(expedition: Expedition): string | null {
  const active = expedition.squadSnapshot.find(
    (slot) => slot !== null && slot.metaStatus === 'active',
  )
  return active?.characterId ?? null
}

export function buildExpeditionBattleSnapshot(
  state: CampaignState,
  expedition: Expedition,
  scenarioSlotIndex: number,
): BattleAttemptSnapshot | null {
  const party: PartyMemberBattleSnapshot[] = []

  expedition.squadSnapshot.forEach((slot, spawnIndex) => {
    if (!slot || slot.metaStatus !== 'active') return
    const character = getCharacter(state, slot.characterId) ?? getPrimaryCharacter(state)
    party.push({
      characterId: slot.characterId,
      unitLevel: character.unitLevel,
      baseStats: { ...character.baseStats },
      items: cloneItems(character.items),
      equipment: { ...slot.equipment },
      cards: cloneCards(character.cards),
      battleLoadout: [...slot.battleLoadout] as BattleLoadout,
      metaStatus: slot.metaStatus,
      spawnIndex,
    })
  })

  if (party.length === 0) return null

  return {
    worldPower: state.worldPower,
    modKillTargetCardId: state.modKillTargetCardId,
    scenarioSlotIndex,
    gold: state.gold,
    party,
  }
}

export function copyBattleAttemptSnapshot(snap: BattleAttemptSnapshot): BattleAttemptSnapshot {
  return {
    worldPower: snap.worldPower,
    modKillTargetCardId: snap.modKillTargetCardId,
    scenarioSlotIndex: snap.scenarioSlotIndex,
    gold: snap.gold,
    party: snap.party.map(clonePartyMember),
  }
}
