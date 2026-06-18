import { describe, expect, it } from 'vitest'
import {
  calcGridRows,
  calcGridSlotCount,
  INVENTORY_MIN_COLS,
  INVENTORY_MIN_ROWS,
} from './inventoryGridUtils'

describe('calcGridRows', () => {
  it('returns minRows when empty', () => {
    expect(calcGridRows(0)).toBe(INVENTORY_MIN_ROWS)
  })

  it('expands rows when items exceed min grid', () => {
    expect(calcGridRows(13, INVENTORY_MIN_COLS, INVENTORY_MIN_ROWS)).toBe(4)
  })
})

describe('calcGridSlotCount', () => {
  it('returns cols * rows', () => {
    expect(calcGridSlotCount(5)).toBe(12)
  })
})
