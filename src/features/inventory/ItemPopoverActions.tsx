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
  actions: PopoverAction[]
}

export function ItemPopoverActions({ inBattle, actions }: ItemPopoverActionsProps) {
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
    return <Tooltip title="Доступно после боя">{buttons}</Tooltip>
  }
  return buttons
}
