import { Space, Typography } from 'antd'
import type { CampaignState } from '../../game/types'
import { getSquadCharacters } from '../../game/character/selectors'
import { UI_LEVEL } from '../../game/ui/labels'

type CampaignHubHudProps = {
  campaign: CampaignState
}

export function CampaignHubHud({ campaign }: CampaignHubHudProps) {
  const squad = getSquadCharacters(campaign)
  return (
    <Space wrap size="middle" style={{ width: '100%', justifyContent: 'center' }}>
      {squad.length > 0 ? (
        squad.map((member) => (
          <Typography.Text key={member.id}>
            {member.name}: {UI_LEVEL}
            <strong>{member.unitLevel}</strong>
          </Typography.Text>
        ))
      ) : (
        <Typography.Text type="secondary">Отряд пуст</Typography.Text>
      )}
      <Typography.Text>
        <span style={{ fontSize: 28, lineHeight: 1, verticalAlign: '-0.18em' }} aria-hidden>
          🪙
        </span>{' '}
        {campaign.gold}
      </Typography.Text>
      <Typography.Text>
        <span style={{ fontSize: 28, lineHeight: 1, verticalAlign: '-0.18em' }} aria-hidden>
          ⚡
        </span>{' '}
        worldPower: {campaign.worldPower}
      </Typography.Text>
    </Space>
  )
}
