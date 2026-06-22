import type { BattleState, CharacterBattleSnapshot, Expedition } from '../types'

/** True when every player-side unit has hp === 0 (party wipe). */
export function isPartyWipe(battle: BattleState): boolean {
  const players = battle.units.filter((u) => u.side === 'player')
  if (players.length === 0) return true
  return players.every((u) => u.hp === 0)
}

/** Character ids of player units at 0 hp after battle. */
export function downedPlayerUnitIds(battle: BattleState): readonly string[] {
  return battle.units.filter((u) => u.side === 'player' && u.hp <= 0).map((u) => u.id)
}

/** Updates expedition squad metaStatus for units downed in battle. */
export function syncDownedAfterBattle(
  expedition: Expedition,
  battle: BattleState,
): readonly (CharacterBattleSnapshot | null)[] {
  return expedition.squadSnapshot.map((slot) => {
    if (!slot) return null
    const playerUnit = battle.units.find(
      (u) => u.side === 'player' && u.id === slot.characterId,
    )
    if (playerUnit && playerUnit.hp <= 0) {
      return { ...slot, metaStatus: 'downed' as const }
    }
    return slot
  })
}
