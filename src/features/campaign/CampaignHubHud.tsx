import { Space, Typography } from 'antd'
import type { CampaignState } from '../../game/types'
import { getPrimaryCharacter } from '../../game/campaign/selectors'
import { UI_LEVEL } from '../../game/ui/labels'

type CampaignHubHudProps = {
  campaign: CampaignState
}

export function CampaignHubHud({ campaign }: CampaignHubHudProps) {
  const hero = getPrimaryCharacter(campaign)
  return (
    <Space wrap size="middle" style={{ width: '100%', justifyContent: 'center' }}>
      <Typography.Text>
        {UI_LEVEL}
        <strong>{hero.unitLevel}</strong>
      </Typography.Text>
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
