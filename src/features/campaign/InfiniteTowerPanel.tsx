import { App, Button, Space, Typography } from 'antd'
import { useMemo } from 'react'
import { EXPEDITION_CHAINS } from '../../game/expedition/config'
import { countOccupiedSquadSlots } from '../../game/expedition/resolveExpeditionParty'
import { previewTowerFloor } from '../../game/tower/preview'
import { hashSeed } from '../../game/stats/rollBaseStats'
import type { CampaignState } from '../../game/types'
import { GamePanel } from '../layout/GamePanel'

const TOWER_PLACEHOLDER_CHAIN = EXPEDITION_CHAINS.find((c) => c.id === 'chaotic-map')!

type InfiniteTowerPanelProps = {
  campaign: CampaignState
  disabled: boolean
  onResetTower: () => void
  onOpenPartyPick: () => void
}

export function InfiniteTowerPanel({
  campaign,
  disabled,
  onResetTower,
  onOpenPartyPick,
}: InfiniteTowerPanelProps) {
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

  const handleStart = () => {
    if (disabled) return
    if (countOccupiedSquadSlots(campaign.squad) < 1) {
      return
    }
    onOpenPartyPick()
  }

  const handleReset = () => {
    if (disabled) return
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
    <GamePanel title="Бесконечная башня 🗼">
      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
        <Typography.Text type="secondary">
          Этаж {currentFloor}
          {bestFloor > 0 ? ` · Рекord: ${bestFloor}` : ''}
        </Typography.Text>
        <Typography.Text>
          👹 {preview.gruntCount}
          {preview.bossCount > 0 ? ` · Босс: ${preview.bossCount}` : ''}
          {preview.affixLabel ? ` · ${preview.affixLabel.title}` : ''}
        </Typography.Text>
        <Typography.Text type={firstClearPending ? undefined : 'secondary'}>
          {firstClearPending
            ? `🎁 Бонус первого прохождения: +${preview.firstClearGold} золота`
            : 'Бонус первого прохождения уже получен'}
        </Typography.Text>
        <Space wrap>
          <Button type="primary" disabled={disabled} onClick={handleStart}>
            В бой (этаж {currentFloor})
          </Button>
          <Button disabled={disabled || tower === null} onClick={handleReset}>
            Сбросить башню
          </Button>
        </Space>
      </Space>
    </GamePanel>
  )
}

export { TOWER_PLACEHOLDER_CHAIN }
