/** Смещения только по 4 ортогональным направлениям (N/E/S/W). */
export const ORTHO_DELTAS: readonly Readonly<{ dx: number; dy: number }>[] = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
]

export function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

export function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by)
}

export function orthoNeighbors(x: number, y: number): [number, number][] {
  return ORTHO_DELTAS.map((d) => [x + d.dx, y + d.dy] as [number, number])
}

export function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height
}

export function wallSet(walls: readonly string[]): ReadonlySet<string> {
  return new Set(walls)
}

export function isBlockedCell(
  x: number,
  y: number,
  width: number,
  height: number,
  walls: ReadonlySet<string>,
): boolean {
  return !inBounds(x, y, width, height) || walls.has(cellKey(x, y))
}
