import { mergeBattleCardsIntoCollection } from '../campaign/mergeBattleCards'
import { playerCardsFromLoadout } from '../campaign/playerCardsFromLoadout'
import type {
  BattlePlayerCard,
  BattleState,
  Character,
  PartyMemberBattleSnapshot,
} from '../types'

export function playerCardsByUnitFromParty(
  party: readonly PartyMemberBattleSnapshot[],
): Record<string, BattlePlayerCard[]> {
  const out: Record<string, BattlePlayerCard[]> = {}
  for (const member of party) {
    if (member.metaStatus !== 'active') continue
    out[member.characterId] = playerCardsFromLoadout(member.cards, member.battleLoadout)
  }
  return out
}

export function mergeBattleCardsToParty(
  party: Character[],
  battle: BattleState,
): Character[] {
  return party.map((c) => {
    const battleCards = battle.playerCardsByUnitId[c.id]
    if (!battleCards) return c
    return {
      ...c,
      cards: mergeBattleCardsIntoCollection(c.cards, battleCards),
    }
  })
}

export function getActorPlayerCards(
  state: BattleState,
  unitId: string | undefined,
): readonly BattlePlayerCard[] {
  if (!unitId) return []
  return state.playerCardsByUnitId[unitId] ?? []
}

export function updateActorPlayerCards(
  state: BattleState,
  unitId: string,
  cards: readonly BattlePlayerCard[],
): BattleState {
  return {
    ...state,
    playerCardsByUnitId: {
      ...state.playerCardsByUnitId,
      [unitId]: cards,
    },
  }
}

export function allBattlePlayerCards(state: BattleState): BattlePlayerCard[] {
  return Object.values(state.playerCardsByUnitId).flat()
}

export function updatePlayerCardById(
  state: BattleState,
  cardId: string,
  nextCard: BattlePlayerCard,
): BattleState {
  let changed = false
  const playerCardsByUnitId = { ...state.playerCardsByUnitId }
  for (const [unitId, cards] of Object.entries(playerCardsByUnitId)) {
    const idx = cards.findIndex((c) => c.id === cardId)
    if (idx < 0) continue
    playerCardsByUnitId[unitId] = cards.map((c, i) => (i === idx ? nextCard : c))
    changed = true
    break
  }
  if (!changed) return state
  return { ...state, playerCardsByUnitId }
}
