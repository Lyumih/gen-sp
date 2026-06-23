import { occupiedEquipmentSlotsInOrder } from '../equipment/equipmentOrder'
import { rollCardLevelUp } from '../memento/rollCardLevelUp'
import { rollWithLuckyRetry, characterHasEffect } from '../specialization/resolve'
import { seededRng } from '../tavern/generateCandidates'
import type { BattlePlayerCard, BattleState, CampaignState, Character, ModSlotState, PassiveInstance } from '../types'

export type VictoryModRollOptions = {
  luckyLm?: boolean
  extraLmRolls?: number
}

export function victoryModRollRng(seed: number): () => number {
  const rng = seededRng(seed)
  return () => Math.floor(rng() * 100) + 1
}

export function applyVictoryModRollsToCarrier<T extends { modSlots: ModSlotState[] }>(
  carrier: T,
  randomInt1to100ForSlot: (slotIndex: number) => number,
  options?: VictoryModRollOptions,
): T {
  let changed = false
  const modSlots = carrier.modSlots.map((slot, slotIndex) => {
    if (slot.status !== 'filled') return slot
    const roll = () => randomInt1to100ForSlot(slotIndex)
    const leveledUp = options?.luckyLm
      ? rollWithLuckyRetry(slot.lm, roll, true)
      : rollCardLevelUp(slot.lm, roll())
    if (leveledUp) {
      changed = true
      return { ...slot, lm: slot.lm + 1 }
    }
    return slot
  })
  let result: T = changed ? { ...carrier, modSlots } : carrier

  const extraRolls = options?.extraLmRolls ?? 0
  for (let i = 0; i < extraRolls; i++) {
    const rerun = applyVictoryModRollsToCarrier(result, randomInt1to100ForSlot, {
      luckyLm: options?.luckyLm,
      extraLmRolls: 0,
    })
    if (rerun !== result) {
      changed = true
      result = rerun
    }
  }

  return changed ? result : carrier
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

function victoryModRollOptionsForOwner(
  campaign: CampaignState,
  ownerId: string,
): VictoryModRollOptions | undefined {
  const luckyLm = characterHasEffect(campaign, ownerId, 'lucky_mod_lm')
  const extraLmRolls = characterHasEffect(campaign, ownerId, 'mod_extra_lm_roll') ? 1 : 0
  if (!luckyLm && extraLmRolls === 0) return undefined
  return {
    ...(luckyLm ? { luckyLm: true } : {}),
    ...(extraLmRolls > 0 ? { extraLmRolls } : {}),
  }
}

export function applyVictoryModRollsToPartyBattle(
  characters: readonly Character[],
  battle: BattleState,
  seed: number,
  campaign: CampaignState,
): { characters: Character[]; battle: BattleState } {
  const nextRoll = victoryModRollRng(seed)
  const rollForSlot = (_slotIndex: number) => nextRoll()

  const playerCardsByUnitId: Record<string, BattlePlayerCard[]> = {}
  for (const [unitId, cards] of Object.entries(battle.playerCardsByUnitId)) {
    const options = victoryModRollOptionsForOwner(campaign, unitId)
    playerCardsByUnitId[unitId] = cards.map((card) =>
      applyVictoryModRollsToCarrier(card, rollForSlot, options),
    )
  }

  const passivesByUnitId: Record<string, PassiveInstance[]> = {}
  if (battle.passivesByUnitId) {
    for (const [unitId, passives] of Object.entries(battle.passivesByUnitId)) {
      const options = victoryModRollOptionsForOwner(campaign, unitId)
      passivesByUnitId[unitId] = passives.map((passive) =>
        applyVictoryModRollsToCarrier(passive, rollForSlot, options),
      )
    }
  }

  const equipped = equippedItemIds(characters)
  const nextCharacters = characters.map((ch) => {
    const options = victoryModRollOptionsForOwner(campaign, ch.id)
    return {
      ...ch,
      items: ch.items.map((item) =>
        equipped.has(item.id) ? applyVictoryModRollsToCarrier(item, rollForSlot, options) : item,
      ),
    }
  })

  return {
    characters: nextCharacters,
    battle: {
      ...battle,
      playerCardsByUnitId,
      ...(Object.keys(passivesByUnitId).length > 0 ? { passivesByUnitId } : {}),
    },
  }
}
