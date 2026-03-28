import { useState } from 'react'
import { FlagOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { Button, Card, Select, Space, Typography } from 'antd'
import { SCENARIOS } from '../../game/campaign/scenarios'
import { useGameStore } from '../../store/gameStore'

export function CampaignHub() {
  const campaign = useGameStore((s) => s.campaign)
  const dispatchRun = useGameStore((s) => s.dispatchRun)
  const [replaySlot, setReplaySlot] = useState(0)
  const done = campaign.scenarioIndex >= SCENARIOS.length
  const scenario = SCENARIOS[campaign.scenarioIndex]

  return (
    <Card
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <FlagOutlined aria-hidden />
          Gen — кампания
        </span>
      }
    >
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <Typography.Text>
          Сценарий:{' '}
          {done
            ? 'пройдено'
            : `${campaign.scenarioIndex + 1} / ${SCENARIOS.length}`}
          {scenario ? ` — ${scenario.id}` : ''}
        </Typography.Text>
        <Typography.Text>
          <span style={{ fontSize: 28, lineHeight: 1, verticalAlign: '-0.18em' }} aria-hidden>
            ⚡
          </span>{' '}
          worldPower: {campaign.worldPower}
        </Typography.Text>
        <Typography.Text>Уровень героя: {campaign.playerUnitLevel}</Typography.Text>
        <div>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            <span style={{ fontSize: 28, lineHeight: 1, verticalAlign: '-0.18em' }} aria-hidden>
              🃏
            </span>{' '}
            Карточки
          </Typography.Text>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {campaign.cards.map((c) => (
              <li key={c.id}>
                {c.templateId} — глоб. ур. {c.global_level}, использований{' '}
                {c.uses_count}
                {c.modifications.length > 0
                  ? `, мод1: ${c.modifications[0]?.level ?? 0}`
                  : ''}
              </li>
            ))}
          </ul>
        </div>
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
                onChange={setReplaySlot}
                options={SCENARIOS.map((s, i) => ({
                  value: i,
                  label: s.id,
                }))}
              />
              <Button
                type="primary"
                disabled={campaign.battle !== null}
                icon={<PlayCircleOutlined />}
                onClick={() =>
                  dispatchRun({
                    type: 'START_REPLAY_BATTLE',
                    scenarioSlotIndex: replaySlot,
                  })
                }
              >
                Играть сценарий
              </Button>
            </Space>
          </>
        ) : (
          <Button
            type="primary"
            disabled={campaign.battle !== null}
            icon={<PlayCircleOutlined />}
            onClick={() => dispatchRun({ type: 'START_OR_CONTINUE_BATTLE' })}
          >
            Начать / продолжить бой
          </Button>
        )}
      </Space>
    </Card>
  )
}
