import { Drawer, Segmented } from 'antd'
import type { CampaignState } from '../../game/types'
import { useGameStore } from '../../store/gameStore'
import type { CampaignReferencePane } from './campaignHubShared'
import { CampaignCodexTab } from '../codex/CampaignCodexTab'
import { CampaignHelpTab } from '../help/CampaignHelpTab'

type CampaignReferenceDrawerProps = {
  campaign: CampaignState
}

export function CampaignReferenceDrawer({ campaign }: CampaignReferenceDrawerProps) {
  const { open, pane, helpFocusArticleId } = useGameStore((s) => s.referenceDrawer)
  const closeReferenceDrawer = useGameStore((s) => s.closeReferenceDrawer)
  const setReferenceDrawerPane = useGameStore((s) => s.setReferenceDrawerPane)
  const clearReferenceHelpFocus = useGameStore((s) => s.clearReferenceHelpFocus)

  return (
    <Drawer
      title="Справочник"
      open={open}
      onClose={closeReferenceDrawer}
      size="large"
      destroyOnHidden
    >
      <Segmented
        block
        value={pane}
        options={[
          { label: 'Кодекс', value: 'codex' },
          { label: 'Справка', value: 'help' },
        ]}
        onChange={(v) => setReferenceDrawerPane(v as CampaignReferencePane)}
        style={{ marginBottom: 16 }}
      />
      {pane === 'codex' ? <CampaignCodexTab campaign={campaign} /> : null}
      {pane === 'help' ? (
        <CampaignHelpTab
          focusArticleId={helpFocusArticleId}
          onFocusConsumed={clearReferenceHelpFocus}
        />
      ) : null}
    </Drawer>
  )
}
