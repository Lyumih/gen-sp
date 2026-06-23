import { occupiedEquipmentSlotsInOrder } from '../equipment/equipmentOrder'
import { rollCardLevelUp } from '../memento/rollCardLevelUp'
import { seededRng } from '../tavern/generateCandidates'
import type { BattlePlayerCard, BattleState, Character, ModSlotState, PassiveInstance } from '../types'

export function victoryModRollRng(seed: number): () => number {
  const rng = seededRng(seed)
  return () => Math.floor(rng() * 100) + 1
}

export function applyVictoryModRollsToCarrier<T extends { modSlots: ModSlotState[] }>(
  carrier: T,
  randomInt1to100ForSlot: (slotIndex: number) => number,
): T {
  let changed = false
  const modSlots = carrier.modSlots.map((slot, slotIndex) => {
    if (slot.status !== 'filled') return slot
    if (rollCardLevelUp(slot.lm, randomInt1to100ForSlot(slotIndex))) {
      changed = true
      return { ...slot, lm: slot.lm + 1 }
    }
    return slot
  })
  return changed ? { ...carrier, modSlots } : carrier
}

function equippedItemIds(characters: readonly Character[]): Set<string> {
  const ids = new Set<string>()
  for (const ch of characters) {
    for (const { itemId } of occupiedEquipmentSlotsInOrder(ch.equipment)) {
      ids.add(itemId)
    }
  }
  return ids
}

export function applyVictoryModRollsToPartyBattle(
  characters: readonly Character[],
  battle: BattleState,
  seed: number,
): { characters: Character[]; battle: BattleState } {
  const nextRoll = victoryModRollRng(seed)
  const rollForSlot = (_slotIndex: number) => nextRoll()

  const playerCardsByUnitId: Record<string, BattlePlayerCard[]> = {}
  for (const [unitId, cards] of Object.entries(battle.playerCardsByUnitId)) {
    playerCardsByUnitId[unitId] = cards.map((card) =>
      applyVictoryModRollsToCarrier(card, rollForSlot),
    )
  }

  const passivesByUnitId: Record<string, PassiveInstance[]> = {}
  if (battle.passivesByUnitId) {
    for (const [unitId, passives] of Object.entries(battle.passivesByUnitId)) {
      passivesByUnitId[unitId] = passives.map((passive) =>
        applyVictoryModRollsToCarrier(passive, rollForSlot),
      )
    }
  }

  const equipped = equippedItemIds(characters)
  const nextCharacters = characters.map((ch) => ({
    ...ch,
    items: ch.items.map((item) =>
      equipped.has(item.id) ? applyVictoryModRollsToCarrier(item, rollForSlot) : item,
    ),
  }))

  return {
    characters: nextCharacters,
    battle: {
      ...battle,
      playerCardsByUnitId,
      ...(Object.keys(passivesByUnitId).length > 0 ? { passivesByUnitId } : {}),
    },
  }
}
