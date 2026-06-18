import type { ReactNode } from 'react'
import {
  calcGridRows,
  INVENTORY_CELL_PX,
  INVENTORY_MIN_COLS,
} from './inventoryGridUtils'
import './inventory.css'

export type InventoryGridProps = {
  itemCount: number
  minCols?: number
  minRows?: number
  renderCell: (index: number, isEmpty: boolean) => ReactNode
}

export function InventoryGrid({
  itemCount,
  minCols = INVENTORY_MIN_COLS,
  minRows,
  renderCell,
}: InventoryGridProps) {
  const rows = calcGridRows(itemCount, minCols, minRows)
  const slotCount = minCols * rows

  return (
    <div
      className="inv-grid"
      style={{
        gridTemplateColumns: `repeat(${minCols}, ${INVENTORY_CELL_PX}px)`,
      }}
    >
      {Array.from({ length: slotCount }, (_, index) => {
        const isEmpty = index >= itemCount
        return <div key={index}>{renderCell(index, isEmpty)}</div>
      })}
    </div>
  )
}
