import type { EquipmentSlot } from '../../../game/types'
import type { LoadoutFocus } from './types'

export type LoadoutFocusAction =
  | { type: 'set'; focus: LoadoutFocus }
  | { type: 'clear' }
  | { type: 'toggleEquip'; slot: EquipmentSlot }

export function loadoutFocusReducer(
  state: LoadoutFocus,
  action: LoadoutFocusAction,
): LoadoutFocus {
  switch (action.type) {
    case 'set':
      return action.focus
    case 'clear':
      return null
    case 'toggleEquip':
      if (state?.kind === 'equip' && state.slot === action.slot) return null
      return { kind: 'equip', slot: action.slot }
    default:
      return state
  }
}
