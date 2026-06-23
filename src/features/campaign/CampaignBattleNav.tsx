import { useState } from 'react'
import { Divider, Drawer, Space } from 'antd'
import { unreadCodexEntryIds } from '../../game/codex/discovery'
import type { CampaignState } from '../../game/types'
import { CampaignHelpTab } from '../help/CampaignHelpTab'
import { CampaignHubHud } from './CampaignHubHud'
import { CampaignHubNav } from './CampaignHubNav'

type CampaignBattleNavProps = {
  campaign: CampaignState
}

export function CampaignBattleNav({ campaign }: CampaignBattleNavProps) {
  const [helpOpen, setHelpOpen] = useState(false)
  const expeditionActive = campaign.expedition !== null
  const inBattle = campaign.battle !== null

  return (
    <>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <CampaignHubHud campaign={campaign} />
        <Divider style={{ margin: '4px 0 8px' }} />
        <CampaignHubNav
          activeTab="battle"
          onTabChange={(tab) => {
            if (tab === 'help') setHelpOpen(true)
          }}
          unreadCodexCount={unreadCodexEntryIds(campaign).length}
          codexDisabled={inBattle}
          shopDisabled={expeditionActive}
          tavernDisabled={expeditionActive}
          battleTabHighlighted
          tabsDisabled
        />
      </Space>

      <Drawer
        title="Справка"
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        size="large"
        destroyOnHidden
      >
        <CampaignHelpTab />
      </Drawer>
    </>
  )
}
