import type { ReactNode } from 'react'
import { Popover, Typography } from 'antd'
import type { BasicActionStatsDescription } from '../../game/descriptions/basicActionText'

type BattleBasicActionPopoverProps = {
  stats: BasicActionStatsDescription
  children: ReactNode
}

export function BattleBasicActionPopover({
  stats,
  children,
}: BattleBasicActionPopoverProps) {
  const content = (
    <div style={{ maxWidth: 320 }}>
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        {stats.title}
      </Typography.Text>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {stats.lines.map((line, index) => (
          <li key={index}>
            <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <Popover trigger="hover" mouseEnterDelay={0.3} destroyOnHidden content={content}>
      {children}
    </Popover>
  )
}
