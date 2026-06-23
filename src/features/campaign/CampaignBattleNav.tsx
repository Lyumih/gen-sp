import { useState } from 'react'
import { Drawer } from 'antd'
import { unreadCodexEntryIds } from '../../game/codex/discovery'
import type { CampaignState } from '../../game/types'
import { CampaignHelpTab } from '../help/CampaignHelpTab'
import { GameHeader } from './GameHeader'
import { GameShell } from '../layout/GameShell'

type CampaignBattleNavProps = {
  campaign: CampaignState
}

export function CampaignBattleNav({ campaign }: CampaignBattleNavProps) {
  const [helpOpen, setHelpOpen] = useState(false)
  const expeditionActive = campaign.expedition !== null
  const inBattle = campaign.battle !== null

  return (
    <>
      <GameShell>
        <GameHeader
          campaign={campaign}
          activeTab="battle"
          onTabChange={(tab) => {
            if (tab === 'help') setHelpOpen(true)
          }}
          unreadCodexCount={unreadCodexEntryIds(campaign).length}
          codexDisabled={inBattle}
          shopDisabled={expeditionActive}
          tavernDisabled={expeditionActive}
          tabsDisabled
          battleScreenActive
          onBattleClick={() => {}}
        />
      </GameShell>

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
