import { describe, expect, it } from 'vitest'
import {
  BATTLE_CELL_GAP_PX,
  BATTLE_CELL_SIZE_PX,
  cellCenterPx,
  cellTopLeftPx,
  parseCellKey,
} from './cellGeometry'

describe('cellGeometry', () => {
  it('computes top-left for origin cell', () => {
    expect(cellTopLeftPx(0, 0)).toEqual({ left: 0, top: 0 })
  })

  it('computes top-left for x=1 with gap', () => {
    expect(cellTopLeftPx(1, 0).left).toBe(BATTLE_CELL_SIZE_PX + BATTLE_CELL_GAP_PX)
  })

  it('computes center as half cell offset', () => {
    const c = cellCenterPx(0, 0)
    expect(c.left).toBe(BATTLE_CELL_SIZE_PX / 2)
    expect(c.top).toBe(BATTLE_CELL_SIZE_PX / 2)
  })

  it('parses cell key', () => {
    expect(parseCellKey('2,3')).toEqual({ x: 2, y: 3 })
  })
})
