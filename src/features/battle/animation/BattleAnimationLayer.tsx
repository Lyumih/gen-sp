import type { CSSProperties } from 'react'
import type { UnitDisplay } from '../../../game/character/display'
import type { Unit } from '../../../game/types'
import { UI_DAMAGE } from '../../../game/ui/labels'
import {
  BATTLE_CELL_SIZE_PX,
  cellCenterPx,
  lungeOffset,
  parseCellKey,
} from './cellGeometry'
import { FloatingCombatText } from './FloatingCombatText'
import { formatDamageFloat, formatHealFloat, formatStatusFloat } from './floatTextMap'
import { FLOAT_READ_MS } from './presetRegistry'
import type { AnimationStep, Cell } from './types'
import '../battle.css'
import './battle-animation.css'

export type BattleAnimationLayerProps = {
  activeStep: AnimationStep | null
  units: readonly Unit[]
  getUnitDisplay: (unitId: string) => UnitDisplay | undefined
}

function unitCell(units: readonly Unit[], unitId: string): Cell | null {
  const u = units.find((x) => x.id === unitId)
  return u ? { x: u.x, y: u.y } : null
}

function GhostToken({
  emoji,
  className,
  style,
}: {
  emoji: string
  className: string
  style: CSSProperties
}) {
  return (
    <span className={`battle-anim-ghost ${className}`} style={style} aria-hidden>
      {emoji}
    </span>
  )
}

function CellFlash({ cell, className }: { cell: Cell; className: string }) {
  const c = cellCenterPx(cell.x, cell.y)
  return (
    <span
      className={`battle-anim-cell-flash ${className}`}
      style={{ left: c.left, top: c.top }}
      aria-hidden
    />
  )
}

function renderStep(
  step: AnimationStep,
  units: readonly Unit[],
  getUnitDisplay: (unitId: string) => UnitDisplay | undefined,
) {
  switch (step.kind) {
    case 'move': {
      const emoji = getUnitDisplay(step.unitId)?.emoji ?? '❓'
      const from = cellCenterPx(step.from.x, step.from.y)
      const to = cellCenterPx(step.to.x, step.to.y)
      return (
        <GhostToken
          emoji={emoji}
          className="battle-anim--move"
          style={{
            left: from.left,
            top: from.top,
            ['--move-dx' as string]: `${to.left - from.left}px`,
            ['--move-dy' as string]: `${to.top - from.top}px`,
          }}
        />
      )
    }
    case 'teleport': {
      const emoji = getUnitDisplay(step.unitId)?.emoji ?? '❓'
      const from = cellCenterPx(step.from.x, step.from.y)
      const to = cellCenterPx(step.to.x, step.to.y)
      return (
        <>
          <GhostToken
            emoji={emoji}
            className="battle-anim--teleport-out"
            style={{ left: from.left, top: from.top }}
          />
          <GhostToken
            emoji={emoji}
            className="battle-anim--teleport-in"
            style={{ left: to.left, top: to.top }}
          />
        </>
      )
    }
    case 'strike_melee': {
      const attackerCell = unitCell(units, step.attackerId)
      const targetCell = unitCell(units, step.targetId)
      if (!attackerCell || !targetCell) return null
      const from = cellCenterPx(attackerCell.x, attackerCell.y)
      const to = cellCenterPx(targetCell.x, targetCell.y)
      const lunge = lungeOffset(from, to)
      const emoji = getUnitDisplay(step.attackerId)?.emoji ?? '❓'
      return (
        <>
          <GhostToken
            emoji={emoji}
            className="battle-anim--strike-lunge"
            style={{
              left: from.left,
              top: from.top,
              ['--lunge-x' as string]: `${lunge.x}px`,
              ['--lunge-y' as string]: `${lunge.y}px`,
            }}
          />
          <CellFlash cell={targetCell} className="battle-anim--hit-flash battle-anim--shake" />
          <FloatingCombatText
            cell={targetCell}
            lines={formatDamageFloat(step.damage, step.absorbedDamage)}
          />
        </>
      )
    }
    case 'projectile': {
      const attackerCell = unitCell(units, step.attackerId)
      const targetCell = unitCell(units, step.targetId)
      if (!attackerCell || !targetCell) return null
      const from = cellCenterPx(attackerCell.x, attackerCell.y)
      const to = cellCenterPx(targetCell.x, targetCell.y)
      return (
        <>
          <span
            className="battle-anim-overlay battle-anim--projectile"
            style={{
              left: from.left,
              top: from.top,
              ['--proj-dx' as string]: `${to.left - from.left}px`,
              ['--proj-dy' as string]: `${to.top - from.top}px`,
            }}
            aria-hidden
          >
            {step.projectileEmoji ?? UI_DAMAGE}
          </span>
          <CellFlash cell={targetCell} className="battle-anim--hit-flash" />
          <FloatingCombatText
            cell={targetCell}
            lines={formatDamageFloat(step.damage, step.absorbedDamage)}
          />
        </>
      )
    }
    case 'cast': {
      const casterCell = unitCell(units, step.casterId)
      const targetCell = unitCell(units, step.targetId)
      if (!casterCell) return null
      const casterPos = cellCenterPx(casterCell.x, casterCell.y)
      const nodes = [
        <CellFlash key="glow" cell={casterCell} className="battle-anim--cast-glow" />,
      ]
      if (targetCell && (targetCell.x !== casterCell.x || targetCell.y !== casterCell.y)) {
        const targetPos = cellCenterPx(targetCell.x, targetCell.y)
        const dx = targetPos.left - casterPos.left
        const dy = targetPos.top - casterPos.top
        const len = Math.hypot(dx, dy) || 1
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI
        nodes.push(
          <span
            key="beam"
            className="battle-anim-overlay battle-anim--cast-beam"
            style={{
              left: casterPos.left,
              top: casterPos.top,
              width: len,
              transform: `rotate(${angle}deg)`,
            }}
            aria-hidden
          />,
        )
      }
      return <>{nodes}</>
    }
    case 'aoe_burst':
      return (
        <>
          {step.cellKeys.map((key) => {
            const cell = parseCellKey(key)
            if (!cell) return null
            const c = cellCenterPx(cell.x, cell.y)
            return (
              <span
                key={key}
                className="battle-anim-cell-flash battle-anim--aoe-burst battle-cell-explosion"
                style={{ left: c.left, top: c.top, width: BATTLE_CELL_SIZE_PX, height: BATTLE_CELL_SIZE_PX }}
                aria-hidden
              />
            )
          })}
          {step.damage !== undefined && step.damage > 0 ? (
            <FloatingCombatText
              cell={step.center}
              lines={formatDamageFloat(step.damage, step.absorbedDamage)}
            />
          ) : null}
        </>
      )
    case 'heal': {
      const targetCell = unitCell(units, step.targetId)
      const healerCell = unitCell(units, step.healerId)
      if (!targetCell) return null
      const targetPos = cellCenterPx(targetCell.x, targetCell.y)
      const nodes = [
        <CellFlash key="pulse" cell={targetCell} className="battle-anim--heal-pulse" />,
        <FloatingCombatText
          key="float"
          cell={targetCell}
          lines={formatHealFloat(step.amount)}
        />,
      ]
      if (
        healerCell &&
        (healerCell.x !== targetCell.x || healerCell.y !== targetCell.y)
      ) {
        const healerPos = cellCenterPx(healerCell.x, healerCell.y)
        const dx = targetPos.left - healerPos.left
        const dy = targetPos.top - healerPos.top
        const len = Math.hypot(dx, dy) || 1
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI
        nodes.unshift(
          <span
            key="beam"
            className="battle-anim-overlay battle-anim--cast-beam"
            style={{
              left: healerPos.left,
              top: healerPos.top,
              width: len,
              transform: `rotate(${angle}deg)`,
              background: 'linear-gradient(90deg, rgba(82, 196, 26, 0.75), rgba(82, 196, 26, 0.1))',
            }}
            aria-hidden
          />,
        )
      }
      return <>{nodes}</>
    }
    case 'resurrect': {
      const targetCell = unitCell(units, step.targetId)
      if (!targetCell) return null
      const emoji = getUnitDisplay(step.targetId)?.emoji ?? '✨'
      const pos = cellCenterPx(targetCell.x, targetCell.y)
      return (
        <>
          <GhostToken
            emoji={emoji}
            className="battle-anim--resurrect"
            style={{ left: pos.left, top: pos.top }}
          />
          <FloatingCombatText
            cell={targetCell}
            lines={formatHealFloat(step.hp)}
          />
        </>
      )
    }
    case 'buff_aura': {
      const cell = unitCell(units, step.unitId)
      if (!cell) return null
      const holyClass = step.holy ? ' battle-anim--buff-aura--holy' : ''
      return (
        <>
          <CellFlash
            cell={cell}
            className={`battle-anim--buff-aura${holyClass}`}
          />
          <FloatingCombatText
            cell={cell}
            lines={formatStatusFloat(step.statusKind, 'buff')}
            holy={step.holy}
          />
        </>
      )
    }
    case 'debuff_aura': {
      const cell = unitCell(units, step.unitId)
      if (!cell) return null
      return (
        <>
          <CellFlash cell={cell} className="battle-anim--debuff-aura" />
          <FloatingCombatText
            cell={cell}
            lines={formatStatusFloat(step.statusKind, 'debuff')}
          />
        </>
      )
    }
    case 'status_tick_dot': {
      const cell = unitCell(units, step.unitId)
      if (!cell) return null
      return (
        <>
          <CellFlash cell={cell} className="battle-anim--tick-dot" />
          <FloatingCombatText
            cell={cell}
            lines={formatDamageFloat(step.damage)}
          />
        </>
      )
    }
    case 'status_tick_regen': {
      const cell = unitCell(units, step.unitId)
      if (!cell) return null
      return (
        <>
          <CellFlash cell={cell} className="battle-anim--tick-regen" />
          <FloatingCombatText
            cell={cell}
            lines={formatHealFloat(step.amount)}
          />
        </>
      )
    }
    case 'death': {
      const emoji = getUnitDisplay(step.unitId)?.emoji ?? '❓'
      const pos = cellCenterPx(step.at.x, step.at.y)
      return (
        <GhostToken
          emoji={emoji}
          className="battle-anim--death"
          style={{ left: pos.left, top: pos.top }}
        />
      )
    }
    default: {
      const _exhaustive: never = step
      return _exhaustive
    }
  }
}

export function BattleAnimationLayer({
  activeStep,
  units,
  getUnitDisplay,
}: BattleAnimationLayerProps) {
  if (!activeStep) return null

  return (
    <div
      className="battle-anim-layer"
      style={{ ['--float-read-ms' as string]: `${FLOAT_READ_MS}ms` }}
      aria-hidden
    >
      {renderStep(activeStep, units, getUnitDisplay)}
    </div>
  )
}
