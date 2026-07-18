import { Typography } from 'antd'
import type { ExpeditionChainConfig } from '../../game/expedition/config'
import './battle-mode-picker.css'

export type BattleModeTileProps = {
  chain: ExpeditionChainConfig
  categoryLabel?: string
  disabled?: boolean
  badge?: string
  onClick: () => void
}

export function BattleModeTile({
  chain,
  categoryLabel,
  disabled = false,
  badge,
  onClick,
}: BattleModeTileProps) {
  const ariaLabel = categoryLabel
    ? `${categoryLabel}. ${chain.label}. ${chain.description}. ${chain.paramEmojiLine}`
    : `${chain.label}. ${chain.description}. ${chain.paramEmojiLine}`

  return (
    <button
      type="button"
      className="game-mode-tile"
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <span className="game-mode-tile__icon" aria-hidden>
        {chain.iconEmoji}
      </span>
      {categoryLabel ? (
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          {categoryLabel}
        </Typography.Text>
      ) : null}
      <Typography.Text strong>{chain.label}</Typography.Text>
      {badge ? (
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          {badge}
        </Typography.Text>
      ) : null}
      <Typography.Text type="secondary" className="game-mode-tile__desc">
        {chain.description}
      </Typography.Text>
      <Typography.Text type="secondary" className="game-mode-tile__params">
        {chain.paramEmojiLine}
      </Typography.Text>
    </button>
  )
}
