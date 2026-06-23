import { describe, expect, it } from 'vitest'
import { createPassiveInstance } from './passiveFactory'
import { canEquipPassive, getEquippedPassives } from './equippedPassives'
import type { PassiveEquipLoadout } from '../types'

describe('equippedPassives', () => {
  const fortitude = createPassiveInstance('warrior_fortitude', 'p-fort')
  const aegis = createPassiveInstance('paladin_aegis', 'p-aegis')
  const vigor = createPassiveInstance('warrior_vigor', 'p-vigor')

  it('getEquippedPassives returns only slotted passives in order', () => {
    const equip: PassiveEquipLoadout = ['p-fort', null, 'p-vigor', null]
    expect(getEquippedPassives([fortitude, vigor, aegis], equip).map((p) => p.id)).toEqual([
      'p-fort',
      'p-vigor',
    ])
  })

  it('canEquipPassive allows non-conflicting passives', () => {
    const equip: PassiveEquipLoadout = ['p-fort', null, null, null]
    expect(canEquipPassive([fortitude, vigor], equip, 'p-vigor', 1)).toEqual({ ok: true })
  })

  it('rejects duplicate stat_flat on same statId', () => {
    const equip: PassiveEquipLoadout = ['p-fort', null, null, null]
    expect(canEquipPassive([fortitude, aegis], equip, 'p-aegis', 1)).toEqual({
      ok: false,
      reason: 'stat_stack_conflict',
    })
  })

  it('rejects unknown passive id', () => {
    const equip: PassiveEquipLoadout = [null, null, null, null]
    expect(canEquipPassive([fortitude], equip, 'missing', 0)).toEqual({
      ok: false,
      reason: 'not_owned',
    })
  })
})
