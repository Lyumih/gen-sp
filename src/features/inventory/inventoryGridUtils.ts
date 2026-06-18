export const INVENTORY_CELL_PX = 56
export const INVENTORY_MIN_COLS = 4
export const INVENTORY_MIN_ROWS = 3

export function calcGridRows(
  itemCount: number,
  minCols = INVENTORY_MIN_COLS,
  minRows = INVENTORY_MIN_ROWS,
): number {
  const needed = itemCount <= 0 ? 0 : Math.ceil(itemCount / minCols)
  return Math.max(minRows, needed)
}

export function calcGridSlotCount(
  itemCount: number,
  minCols = INVENTORY_MIN_COLS,
  minRows = INVENTORY_MIN_ROWS,
): number {
  return minCols * calcGridRows(itemCount, minCols, minRows)
}
