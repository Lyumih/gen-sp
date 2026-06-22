import { Button, Space, Tooltip } from 'antd'

export type PopoverAction = {
  key: string
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  type?: 'primary' | 'default'
}

export type ItemPopoverActionsProps = {
  inBattle: boolean
  disabledTooltip?: string
  actions: PopoverAction[]
}

export function ItemPopoverActions({
  inBattle,
  disabledTooltip,
  actions,
}: ItemPopoverActionsProps) {
  const buttons = (
    <Space wrap size="small">
      {actions.map((a) => (
        <Button
          key={a.key}
          size="small"
          type={a.danger ? 'primary' : (a.type ?? 'default')}
          danger={a.danger}
          disabled={inBattle || a.disabled}
          onClick={a.onClick}
        >
          {a.label}
        </Button>
      ))}
    </Space>
  )

  if (inBattle) {
    return <Tooltip title={disabledTooltip ?? 'Доступно после боя'}>{buttons}</Tooltip>
  }
  return buttons
}
