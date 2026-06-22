import type { ReactNode } from 'react'
import { Popover, Typography } from 'antd'
import type { UnitDisplay } from '../../game/character/display'
import type { BaseStats } from '../../game/types'
import { UI_HEART } from '../../game/ui/labels'
import { StatStrip } from '../stats/StatStrip'

type BattleUnitTooltipProps = {
  display: UnitDisplay
  baseStats: BaseStats
  effectiveStats?: BaseStats
  hp: number
  maxHp: number
  children: ReactNode
}

export function BattleUnitTooltip({
  display,
  baseStats,
  effectiveStats,
  hp,
  maxHp,
  children,
}: BattleUnitTooltipProps) {
  const content = (
    <div style={{ maxWidth: 320 }}>
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        {display.emoji} {display.name}
      </Typography.Text>
      <StatStrip baseStats={baseStats} effectiveStats={effectiveStats} />
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
        {UI_HEART} в бою: {hp}/{maxHp}
      </Typography.Text>
    </div>
  )

  return (
    <Popover
      trigger="hover"
      mouseEnterDelay={0.3}
      destroyOnHidden
      content={content}
    >
      {children}
    </Popover>
  )
}
