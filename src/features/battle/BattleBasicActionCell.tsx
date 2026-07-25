import type { BasicActionKind } from '../../game/descriptions/basicActionText'
import { describeBasicActionStats } from '../../game/descriptions/basicActionText'
import type { BattleState, Unit } from '../../game/types'
import { InventoryCell } from '../inventory/InventoryCell'
import { BattleBasicActionPopover } from './BattleBasicActionPopover'

export type BattleBasicActionCellProps = {
  kind: BasicActionKind
  battle: BattleState
  actor?: Unit
  effectiveRangedRange: number
  rangedCooldownRemaining: number
  selected: boolean
  disabled: boolean
  onSelect: () => void
}

export function BattleBasicActionCell({
  kind,
  battle,
  actor,
  effectiveRangedRange,
  rangedCooldownRemaining,
  selected,
  disabled,
  onSelect,
}: BattleBasicActionCellProps) {
  const stats = describeBasicActionStats({
    kind,
    battle,
    actor,
    effectiveRangedRange,
    rangedCooldownRemaining,
  })
  const cellDisabled =
    disabled || (kind === 'ranged' && rangedCooldownRemaining > 0)
  const ariaLabel = `${stats.title}, ${stats.contextBadge}`

  return (
    <BattleBasicActionPopover stats={stats}>
      <InventoryCell
        emoji={stats.centerEmoji}
        contextBadge={stats.contextBadge}
        state={cellDisabled ? 'disabled' : 'filled'}
        className={selected ? 'inv-cell--selected' : undefined}
        ariaLabel={ariaLabel}
        onClick={() => {
          if (cellDisabled) return
          onSelect()
        }}
      />
    </BattleBasicActionPopover>
  )
}
