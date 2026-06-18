import type {
  BattleAttemptSnapshot,
  BattleLoadout,
  CampaignState,
  CardInstance,
  ItemInstance,
} from '../types'

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
  return {
    worldPower: state.worldPower,
    cards: cloneCards(state.cards),
    battleLoadout: [...state.battleLoadout] as BattleLoadout,
    playerUnitLevel: state.playerUnitLevel,
    modKillTargetCardId: state.modKillTargetCardId,
    scenarioSlotIndex,
    gold: state.gold,
    items: cloneItems(state.items),
    equipment: { ...state.equipment },
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
