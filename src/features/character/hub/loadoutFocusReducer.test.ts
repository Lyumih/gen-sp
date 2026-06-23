import { describe, expect, it } from 'vitest'
import { loadoutFocusReducer } from './loadoutFocusReducer'

describe('loadoutFocusReducer', () => {
  it('toggles equip slot focus', () => {
    let state = loadoutFocusReducer(null, { type: 'toggleEquip', slot: 'weapon' })
    expect(state).toEqual({ kind: 'equip', slot: 'weapon' })
    state = loadoutFocusReducer(state, { type: 'toggleEquip', slot: 'weapon' })
    expect(state).toBeNull()
  })
})
