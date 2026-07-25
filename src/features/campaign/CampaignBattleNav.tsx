import { unreadCodexEntryIds } from '../../game/codex/discovery'
import type { CampaignState } from '../../game/types'
import { useGameStore } from '../../store/gameStore'
import { GameHeader } from './GameHeader'
import { GameShell } from '../layout/GameShell'

type CampaignBattleNavProps = {
  campaign: CampaignState
}

export function CampaignBattleNav({ campaign }: CampaignBattleNavProps) {
  const expeditionActive = campaign.expedition !== null
  const referenceDrawer = useGameStore((s) => s.referenceDrawer)
  const openReferenceDrawer = useGameStore((s) => s.openReferenceDrawer)

  return (
    <GameShell>
      <GameHeader
        campaign={campaign}
        activeTab="battle"
        onTabChange={() => {}}
        unreadCodexCount={unreadCodexEntryIds(campaign).length}
        shopDisabled={expeditionActive}
        tavernDisabled={expeditionActive}
        tabsDisabled
        referenceDrawerOpen={referenceDrawer.open}
        referencePane={referenceDrawer.pane}
        onCodexClick={() => openReferenceDrawer('codex')}
        onHelpClick={() => openReferenceDrawer('help')}
        battleScreenActive
        onBattleClick={() => {}}
      />
    </GameShell>
  )
}
