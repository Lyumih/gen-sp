import { PlayCircleOutlined } from '@ant-design/icons'
import { Button, Select, Space, Typography } from 'antd'
import { SCENARIOS } from '../../game/campaign/scenarios'

type CampaignBattleTabProps = {
  done: boolean
  inBattle: boolean
  scenarioIndex: number
  scenarioId: string | undefined
  replaySlot: number
  onReplaySlotChange: (slot: number) => void
  onStartOrContinue: () => void
  onStartReplay: () => void
}

export function CampaignBattleTab({
  done,
  inBattle,
  scenarioIndex,
  scenarioId,
  replaySlot,
  onReplaySlotChange,
  onStartOrContinue,
  onStartReplay,
}: CampaignBattleTabProps) {
  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }} role="tabpanel">
      {done ? (
        <>
          <Typography.Text type="secondary">
            Цепочка сценариев пройдена. Можно снова сыграть любой сценарий с текущим прогрессом.
          </Typography.Text>
          <Space wrap style={{ width: '100%' }}>
            <Select
              aria-label="Сценарий для повтора"
              style={{ minWidth: 200 }}
              value={replaySlot}
              onChange={onReplaySlotChange}
              options={SCENARIOS.map((s, i) => ({
                value: i,
                label: s.id,
              }))}
            />
            <Button
              type="primary"
              disabled={inBattle}
              icon={<PlayCircleOutlined />}
              onClick={onStartReplay}
            >
              Играть сценарий
            </Button>
          </Space>
        </>
      ) : (
        <Button
          type="primary"
          disabled={inBattle}
          icon={<PlayCircleOutlined />}
          onClick={onStartOrContinue}
        >
          Начать / продолжить бой
        </Button>
      )}

      <Typography.Text>
        Сценарий:{' '}
        {done ? 'пройдено' : `${scenarioIndex + 1} / ${SCENARIOS.length}`}
        {scenarioId ? ` — ${scenarioId}` : ''}
      </Typography.Text>
    </Space>
  )
}
