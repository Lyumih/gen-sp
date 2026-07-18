import { FlagOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Alert, App, Button, Space } from 'antd'
import { getExpeditionChainLabel } from '../../game/expedition/expeditionLabels'
import type { CampaignState } from '../../game/types'
import { useGameStore } from '../../store/gameStore'

type ExpeditionOrphanPanelProps = {
  campaign: CampaignState
}

export function ExpeditionOrphanPanel({ campaign }: ExpeditionOrphanPanelProps) {
  const { modal } = App.useApp()
  const dispatchRun = useGameStore((s) => s.dispatchRun)
  const expedition = campaign.expedition

  if (!expedition || campaign.phase !== 'hub' || campaign.battle !== null) {
    return null
  }

  const label = getExpeditionChainLabel(expedition.scenarioChainId)
  const battleLabel = `${expedition.battleIndex + 1} / ${expedition.battleCount}`

  const confirmFinishExpedition = () => {
    modal.confirm({
      title: 'Завершить экспедицию?',
      content:
        'Экспедиция будет прервана. Незавершённые бои не засчитаются; награды за них не начислятся. Состав отряда снова станет доступен в хабе.',
      okText: 'Завершить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: () => {
        dispatchRun({ type: 'FINISH_EXPEDITION' })
      },
    })
  }

  return (
    <Alert
      type="warning"
      showIcon
      message={`Экспедиция: ${label}`}
      description={`Бой ${battleLabel}. Продолжите или завершите экспедицию.`}
      action={
        <Space orientation="vertical" size="small">
          <Button
            type="primary"
            icon={<ThunderboltOutlined aria-hidden />}
            onClick={() => dispatchRun({ type: 'RESUME_EXPEDITION_FROM_HUB' })}
          >
            Продолжить экспедицию
          </Button>
          <Button danger icon={<FlagOutlined aria-hidden />} onClick={confirmFinishExpedition}>
            Завершить экспедицию
          </Button>
        </Space>
      }
    />
  )
}
