import { Checkbox, Space, Typography } from 'antd'
import type { ExpeditionChainConfig } from '../../game/expedition/config'

export type ExpeditionModeListProps = {
  chains: readonly ExpeditionChainConfig[]
  selectedChainId: string
  disabled?: boolean
  onSelect: (chainId: string) => void
}

export function ExpeditionModeList({
  chains,
  selectedChainId,
  disabled = false,
  onSelect,
}: ExpeditionModeListProps) {
  return (
    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
      {chains.map((chain) => (
        <Checkbox
          key={chain.id}
          checked={selectedChainId === chain.id}
          onChange={() => onSelect(chain.id)}
          disabled={disabled}
        >
          <Typography.Text strong>{chain.label}</Typography.Text>
          <Typography.Text type="secondary"> — {chain.description}</Typography.Text>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            {chain.paramPreview}
          </Typography.Text>
        </Checkbox>
      ))}
    </Space>
  )
}
