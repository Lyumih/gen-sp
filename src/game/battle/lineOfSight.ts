import { cellKey } from './grid'

/** Клетки на отрезке Bresenham (включая начало и конец). */
function bresenhamLine(ax: number, ay: number, bx: number, by: number): [number, number][] {
  const points: [number, number][] = []
  let x = ax
  let y = ay
  const dx = Math.abs(bx - ax)
  const dy = Math.abs(by - ay)
  const sx = ax < bx ? 1 : -1
  const sy = ay < by ? 1 : -1
  let err = dx - dy

  while (true) {
    points.push([x, y])
    if (x === bx && y === by) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }
  return points
}

/**
 * Прямая видимость: стены на клетках между (ax,ay) и (bx,by) блокируют луч.
 * Юниты луч не блокируют.
 */
export function hasLineOfSight(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  walls: ReadonlySet<string>,
): boolean {
  const line = bresenhamLine(ax, ay, bx, by)
  for (let i = 1; i < line.length - 1; i++) {
    const [x, y] = line[i]!
    if (walls.has(cellKey(x, y))) return false
  }
  return true
}
