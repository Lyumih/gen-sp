import type { CSSProperties } from 'react'
import {
  OVERLAY_ACTION_RANGE,
  OVERLAY_AOE,
  OVERLAY_CELL_BG,
  OVERLAY_MOVE,
  OVERLAY_THREAT_BASE,
  OVERLAY_THREAT_DIM,
  OVERLAY_THREAT_FOCUS,
  OVERLAY_VALID_TARGET,
  OVERLAY_WALL_BG,
} from './battleOverlayColors'

export type CellOverlayLayers = {
  isWall?: boolean
  threatBase?: boolean
  threatFocus?: boolean
  dimThreat?: boolean
  move?: boolean
  actionRange?: boolean
  aoe?: boolean
  validTarget?: boolean
}

function resolveOverlayColor(layers: CellOverlayLayers): string | undefined {
  if (layers.validTarget) return OVERLAY_VALID_TARGET
  if (layers.aoe) return OVERLAY_AOE
  if (layers.move) return OVERLAY_MOVE
  if (layers.actionRange) return OVERLAY_ACTION_RANGE
  if (layers.threatFocus) return OVERLAY_THREAT_FOCUS
  if (layers.dimThreat) return OVERLAY_THREAT_DIM
  if (layers.threatBase) return OVERLAY_THREAT_BASE
  return undefined
}

export function cellBackgroundStyle(layers: CellOverlayLayers): CSSProperties {
  if (layers.isWall) {
    return { background: OVERLAY_WALL_BG, color: '#fff' }
  }
  const overlay = resolveOverlayColor(layers)
  return {
    background: overlay ?? OVERLAY_CELL_BG,
    color: '#000',
  }
}

export type LegendItem = { label: string; color: string }

export const OVERLAY_LEGEND: readonly LegendItem[] = [
  { label: 'Ход', color: OVERLAY_MOVE },
  { label: 'Дальность', color: OVERLAY_ACTION_RANGE },
  { label: 'Область', color: OVERLAY_AOE },
  { label: 'Угроза', color: OVERLAY_THREAT_BASE },
]
