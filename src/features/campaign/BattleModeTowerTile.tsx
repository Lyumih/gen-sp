import { App, Button, Typography } from 'antd'
import { useMemo, type MouseEvent } from 'react'
import { previewTowerFloor } from '../../game/tower/preview'
import { hashSeed } from '../../game/stats/rollBaseStats'
import type { CampaignState } from '../../game/types'
import { BATTLE_MODE_CATEGORY } from './battleModeCategories'
import './battle-mode-picker.css'

export type BattleModeTowerTileProps = {
  campaign: CampaignState
  disabled: boolean
  onStart: () => void
  onResetTower: () => void
}

export function BattleModeTowerTile({
  campaign,
  disabled,
  onStart,
  onResetTower,
}: BattleModeTowerTileProps) {
  const { modal } = App.useApp()

  const tower = campaign.tower
  const runSeed =
    tower?.runSeed ?? hashSeed(`tower-preview:${campaign.battleAttemptId}`)
  const currentFloor = tower?.currentFloor ?? 1
  const bestFloor = tower?.bestFloor ?? 0

  const preview = useMemo(
    () => previewTowerFloor(runSeed, currentFloor),
    [runSeed, currentFloor],
  )

  const firstClearPending =
    tower === null || !tower.floorsFirstCleared.includes(currentFloor)

  const badge =
    bestFloor > 0 ? `Этаж ${currentFloor} · Рекord: ${bestFloor}` : `Этаж ${currentFloor}`

  const descParts = [`👹 ${preview.gruntCount}`]
  if (preview.bossCount > 0) descParts.push(`Босс: ${preview.bossCount}`)
  if (preview.affixLabel) descParts.push(preview.affixLabel.title)

  const paramsLine = firstClearPending
    ? `🎁 Бонус первого прохождения: +${preview.firstClearGold} золота`
    : 'Бонус первого прохождения уже получен'

  const ariaLabel = `${BATTLE_MODE_CATEGORY.trial}. Бесконечная башня. ${badge}. ${descParts.join('. ')}. ${paramsLine}`

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled || tower === null) return
    modal.confirm({
      title: 'Сбросить башню?',
      content:
        'Начнёте с этажа 1 с новым набором врагов. Рекord и уже полученные бонусы первого прохождения сохранятся.',
      okText: 'Сбросить',
      cancelText: 'Отмена',
      onOk: onResetTower,
    })
  }

  return (
    <div
      className="game-mode-tile game-mode-tile--tower"
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={ariaLabel}
      onClick={() => {
        if (disabled) return
        onStart()
      }}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onStart()
        }
      }}
    >
      <span className="game-mode-tile__icon" aria-hidden>
        🗼
      </span>
      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
        {BATTLE_MODE_CATEGORY.trial}
      </Typography.Text>
      <Typography.Text strong>Бесконечная башня</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
        {badge}
      </Typography.Text>
      <Typography.Text type="secondary" className="game-mode-tile__desc">
        {descParts.join(' · ')}
      </Typography.Text>
      <Typography.Text
        type="secondary"
        className="game-mode-tile__params"
        style={firstClearPending ? undefined : { opacity: 0.65 }}
      >
        {paramsLine}
      </Typography.Text>
      <Button
        size="small"
        type="link"
        disabled={disabled || tower === null}
        className="game-mode-tile__reset"
        onClick={handleReset}
      >
        Сбросить башню
      </Button>
    </div>
  )
}
