import { cloneModSlots } from '../memento/modSlotsClone'
import { getEquippedPassives } from '../passives/equippedPassives'
import type { PassiveInstance, PartyMemberBattleSnapshot } from '../types'

export function equippedPassivesForBattle(
  passives: readonly PassiveInstance[],
  passiveEquip: PartyMemberBattleSnapshot['passiveEquip'],
): PassiveInstance[] {
  return getEquippedPassives(passives, passiveEquip).map((p) => ({
    ...p,
    modSlots: cloneModSlots(p.modSlots),
  }))
}

export function passivesByUnitFromParty(
  party: readonly PartyMemberBattleSnapshot[],
): Record<string, PassiveInstance[]> {
  const out: Record<string, PassiveInstance[]> = {}
  for (const member of party) {
    if (member.metaStatus !== 'active') continue
    const passiveEquip = member.passiveEquip ?? [null, null, null, null]
    const equipped = equippedPassivesForBattle(member.passives ?? [], passiveEquip)
    if (equipped.length > 0) {
      out[member.characterId] = equipped
    }
  }
  return out
}

export function passiveEquipFromBattlePassives(
  passives: readonly PassiveInstance[],
): PartyMemberBattleSnapshot['passiveEquip'] {
  const equip: PartyMemberBattleSnapshot['passiveEquip'] = [null, null, null, null]
  passives.forEach((p, i) => {
    if (i < 4) equip[i] = p.id
  })
  return equip
}
