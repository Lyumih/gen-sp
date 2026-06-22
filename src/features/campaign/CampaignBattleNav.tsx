import { Divider, Space } from 'antd'
import { unreadCodexEntryIds } from '../../game/codex/discovery'
import type { CampaignState } from '../../game/types'
import { CampaignHubHud } from './CampaignHubHud'
import { CampaignHubNav } from './CampaignHubNav'

type CampaignBattleNavProps = {
  campaign: CampaignState
}

export function CampaignBattleNav({ campaign }: CampaignBattleNavProps) {
  const expeditionActive = campaign.expedition !== null
  const inBattle = campaign.battle !== null

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <CampaignHubHud campaign={campaign} />
      <Divider style={{ margin: '4px 0 8px' }} />
      <CampaignHubNav
        activeTab="battle"
        onTabChange={() => {}}
        unreadCodexCount={unreadCodexEntryIds(campaign).length}
        codexDisabled={inBattle}
        shopDisabled={expeditionActive}
        tavernDisabled={expeditionActive}
        battleTabHighlighted
        tabsDisabled
      />
    </Space>
  )
}
