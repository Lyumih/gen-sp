import { Popover, Typography } from 'antd'
import type { ReactNode } from 'react'
import { UI_END_TURN } from '../../game/ui/labels'
import { InventoryCell } from '../inventory/InventoryCell'

const END_TURN_TITLE = 'Завершить ход'
const END_TURN_LINES = [
  'Пропустить оставшиеся действия и передать ход следующему бойцу.',
  'Можно использовать, если не хотите двигаться или атаковать.',
]

type BattleEndTurnCellProps = {
  disabled: boolean
  onEndTurn: () => void
}

function EndTurnPopover({ children }: { children: ReactNode }) {
  const content = (
    <div style={{ maxWidth: 320 }}>
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        {END_TURN_TITLE}
      </Typography.Text>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {END_TURN_LINES.map((line, index) => (
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

export function BattleEndTurnCell({ disabled, onEndTurn }: BattleEndTurnCellProps) {
  const ariaLabel = END_TURN_TITLE

  return (
    <EndTurnPopover>
      <InventoryCell
        emoji={UI_END_TURN}
        state={disabled ? 'disabled' : 'filled'}
        ariaLabel={ariaLabel}
        onClick={() => {
          if (disabled) return
          onEndTurn()
        }}
      />
    </EndTurnPopover>
  )
}
