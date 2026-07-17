import type { Cell } from './types'

export const BATTLE_CELL_SIZE_PX = 58
export const BATTLE_CELL_GAP_PX = 4

export function cellTopLeftPx(x: number, y: number): { left: number; top: number } {
  const stride = BATTLE_CELL_SIZE_PX + BATTLE_CELL_GAP_PX
  return { left: x * stride, top: y * stride }
}

export function cellCenterPx(x: number, y: number): { left: number; top: number } {
  const tl = cellTopLeftPx(x, y)
  return {
    left: tl.left + BATTLE_CELL_SIZE_PX / 2,
    top: tl.top + BATTLE_CELL_SIZE_PX / 2,
  }
}

export function parseCellKey(key: string): Cell | null {
  const [xs, ys] = key.split(',')
  if (xs === undefined || ys === undefined) return null
  const x = Number(xs)
  const y = Number(ys)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

export function lungeOffset(
  from: { left: number; top: number },
  to: { left: number; top: number },
  px = 8,
): { x: number; y: number } {
  const dx = to.left - from.left
  const dy = to.top - from.top
  const len = Math.hypot(dx, dy) || 1
  return { x: (dx / len) * px, y: (dy / len) * px }
}
