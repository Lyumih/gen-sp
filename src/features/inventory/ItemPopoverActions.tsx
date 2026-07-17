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
  /** Expedition freeze etc. — disables actions with disabledTooltip, not battle copy */
  actionsLocked?: boolean
  disabledTooltip?: string
  actions: PopoverAction[]
}

export function ItemPopoverActions({
  inBattle,
  actionsLocked = false,
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
          disabled={inBattle || actionsLocked || a.disabled}
          onClick={a.onClick}
        >
          {a.label}
        </Button>
      ))}
    </Space>
  )

  if (inBattle || actionsLocked) {
    const title =
      disabledTooltip ??
      (inBattle ? 'Доступно после боя' : 'Недоступно во время экспедиции')
    return <Tooltip title={title}>{buttons}</Tooltip>
  }
  return buttons
}
