import type { ReactNode } from 'react'
import { Popover, Tooltip, Typography } from 'antd'
import type { UnitDisplay } from '../../game/character/display'
import type { BaseStats } from '../../game/types'
import { UI_HEART } from '../../game/ui/labels'
import { StatTooltipList } from '../stats/StatTooltipList'

type BattleUnitTooltipProps = {
  display: UnitDisplay
  baseStats: BaseStats
  effectiveStats?: BaseStats
  hp: number
  maxHp: number
  children: ReactNode
  /** Touch mode: controlled popover */
  touchOpen?: boolean
  onTouchOpenChange?: (open: boolean) => void
}

export function BattleUnitTooltip({
  display,
  baseStats,
  effectiveStats,
  hp,
  maxHp,
  children,
  touchOpen,
  onTouchOpenChange,
}: BattleUnitTooltipProps) {
  const content = (
    <div style={{ maxWidth: 280 }}>
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        {display.emoji} {display.name}
      </Typography.Text>
      <StatTooltipList baseStats={baseStats} effectiveStats={effectiveStats} />
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
        {UI_HEART} в бою: {hp}/{maxHp}
      </Typography.Text>
    </div>
  )

  if (onTouchOpenChange !== undefined) {
    return (
      <Popover
        trigger="click"
        open={touchOpen}
        onOpenChange={onTouchOpenChange}
        content={content}
      >
        {children}
      </Popover>
    )
  }

  return (
    <Tooltip mouseEnterDelay={0.3} title={content}>
      {children}
    </Tooltip>
  )
}
