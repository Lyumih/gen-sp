import type { CSSProperties } from 'react'
import { cellCenterPx } from './cellGeometry'
import type { FloatLine } from './floatTextMap'
import type { Cell } from './types'

export type FloatingCombatTextProps = {
  cell: Cell
  lines: readonly FloatLine[]
  holy?: boolean
}

function variantClass(variant: FloatLine['variant'], holy?: boolean): string {
  if (variant === 'buff' && holy) return 'battle-anim--float--buff--holy'
  return `battle-anim--float--${variant}`
}

export function FloatingCombatText({ cell, lines, holy }: FloatingCombatTextProps) {
  if (lines.length === 0) return null
  const pos = cellCenterPx(cell.x, cell.y)

  return (
    <span
      className="battle-anim-overlay battle-anim--float-stack"
      style={{ left: pos.left, top: pos.top }}
      aria-hidden
    >
      {lines.map((line, i) => {
        const style: CSSProperties = {}
        if (line.delayMs) style.animationDelay = `${line.delayMs}ms`
        return (
          <span
            key={`${line.variant}-${i}`}
            className={`battle-anim--float ${variantClass(line.variant, holy)}`}
            style={style}
          >
            {line.text}
          </span>
        )
      })}
    </span>
  )
}
