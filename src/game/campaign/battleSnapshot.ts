import { getCharacter } from '../character/selectors'
import type {
  BattleAttemptSnapshot,
  BattleLoadout,
  CampaignState,
  CardInstance,
  Expedition,
  ItemInstance,
} from '../types'
import { getPrimaryCharacter } from './selectors'

export function cloneCards(cards: readonly CardInstance[]): CardInstance[] {
  return cards.map((c) => ({
    ...c,
    modifications: c.modifications.map((m) => ({ ...m })),
  }))
}

export function cloneItems(items: readonly ItemInstance[]): ItemInstance[] {
  return items.map((i) => ({ ...i }))
}

export function buildBattleAttemptSnapshot(
  state: CampaignState,
  scenarioSlotIndex: number,
): BattleAttemptSnapshot {
  const hero = getPrimaryCharacter(state)
  return {
    worldPower: state.worldPower,
    cards: cloneCards(hero.cards),
    battleLoadout: [...hero.battleLoadout] as BattleLoadout,
    playerUnitLevel: hero.unitLevel,
    modKillTargetCardId: state.modKillTargetCardId,
    scenarioSlotIndex,
    gold: state.gold,
    items: cloneItems(hero.items),
    equipment: { ...hero.equipment },
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
  const characterId = getExpeditionBattleCharacterId(expedition)
  if (!characterId) return null

  const slot = expedition.squadSnapshot.find(
    (s) => s !== null && s.characterId === characterId,
  )
  const character = getCharacter(state, characterId) ?? getPrimaryCharacter(state)

  return {
    worldPower: state.worldPower,
    cards: cloneCards(character.cards),
    battleLoadout: slot ? ([...slot.battleLoadout] as BattleLoadout) : [...character.battleLoadout],
    playerUnitLevel: character.unitLevel,
    modKillTargetCardId: state.modKillTargetCardId,
    scenarioSlotIndex,
    gold: state.gold,
    items: cloneItems(character.items),
    equipment: slot ? { ...slot.equipment } : { ...character.equipment },
  }
}

export function copyBattleAttemptSnapshot(snap: BattleAttemptSnapshot): BattleAttemptSnapshot {
  return {
    worldPower: snap.worldPower,
    cards: cloneCards(snap.cards),
    battleLoadout: [...snap.battleLoadout] as BattleLoadout,
    playerUnitLevel: snap.playerUnitLevel,
    modKillTargetCardId: snap.modKillTargetCardId,
    scenarioSlotIndex: snap.scenarioSlotIndex,
    gold: snap.gold,
    items: cloneItems(snap.items),
    equipment: { ...snap.equipment },
  }
}
