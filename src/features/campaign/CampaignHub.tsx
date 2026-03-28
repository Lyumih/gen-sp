import { Button, Card, Space, Typography } from 'antd'
import { SCENARIOS } from '../../game/campaign/scenarios'
import { useGameStore } from '../../store/gameStore'

export function CampaignHub() {
  const campaign = useGameStore((s) => s.campaign)
  const dispatchRun = useGameStore((s) => s.dispatchRun)
  const done = campaign.scenarioIndex >= SCENARIOS.length
  const scenario = SCENARIOS[campaign.scenarioIndex]

  return (
    <Card title="Gen — кампания">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Typography.Text>
          Сценарий:{' '}
          {done
            ? 'пройдено'
            : `${campaign.scenarioIndex + 1} / ${SCENARIOS.length}`}
          {scenario ? ` — ${scenario.id}` : ''}
        </Typography.Text>
        <Typography.Text>worldPower: {campaign.worldPower}</Typography.Text>
        <Typography.Text>Уровень героя: {campaign.playerUnitLevel}</Typography.Text>
        <div>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
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
        <Button
          type="primary"
          disabled={done || campaign.battle !== null}
          onClick={() => dispatchRun({ type: 'START_OR_CONTINUE_BATTLE' })}
        >
          {done ? 'Все бои пройдены' : 'Начать / продолжить бой'}
        </Button>
      </Space>
    </Card>
  )
}
