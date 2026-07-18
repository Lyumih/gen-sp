/** Shared battle grid cell metrics (keep in sync with animation `cellGeometry`). */
export const BATTLE_CELL_BASE_PX = 58
export const BATTLE_CELL_BASE_GAP_PX = 4

/** Visual upscale for tiny tactical maps (duel 1×2, etc.). */
export function battleGridScale(width: number, height: number): number {
  const cells = width * height
  if (cells <= 2) return 2.5
  if (cells <= 6) return 2
  if (cells <= 12) return 1.5
  return 1
}
