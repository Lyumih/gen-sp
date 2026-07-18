import { Typography } from 'antd'
import type { PlaceholderModeDef } from '../../game/modes/placeholders'
import './battle-mode-picker.css'

export type BattleModePlaceholderTileProps = {
  mode: PlaceholderModeDef
}

export function BattleModePlaceholderTile({ mode }: BattleModePlaceholderTileProps) {
  const ariaLabel = `${mode.label}. Скоро. ${mode.description}. ${mode.paramEmojiLine}`

  return (
    <button
      type="button"
      className="game-mode-tile game-mode-tile--soon"
      disabled
      aria-label={ariaLabel}
    >
      <span className="game-mode-tile__icon" aria-hidden>
        {mode.iconEmoji}
      </span>
      <Typography.Text strong>{mode.label}</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
        Скоро
      </Typography.Text>
      <Typography.Text type="secondary" className="game-mode-tile__desc">
        {mode.description}
      </Typography.Text>
      <Typography.Text type="secondary" className="game-mode-tile__params">
        {mode.paramEmojiLine}
      </Typography.Text>
    </button>
  )
}
