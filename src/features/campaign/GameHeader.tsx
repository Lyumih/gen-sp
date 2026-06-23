import { PlayCircleOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import type { CampaignState } from '../../game/types'
import { UI_DNA, UI_GOLD, UI_WORLD_POWER } from '../../game/ui/labels'
import type { CampaignHubTab } from './campaignHubShared'
import { isBattleContextActive } from './campaignHubShared'
import { CampaignHubNav } from './CampaignHubNav'
import { GOLD_TOOLTIP, WORLD_POWER_TOOLTIP } from './resourceTooltips'
import '../layout/game-layout.css'

type GameHeaderProps = {
  campaign: CampaignState
  activeTab: CampaignHubTab
  onTabChange: (tab: CampaignHubTab) => void
  unreadCodexCount: number
  codexDisabled: boolean
  shopDisabled: boolean
  tavernDisabled: boolean
  tabsDisabled?: boolean
  onBattleClick: () => void
  battleScreenActive?: boolean
}

export function GameHeader({
  campaign,
  activeTab,
  onTabChange,
  unreadCodexCount,
  codexDisabled,
  shopDisabled,
  tavernDisabled,
  tabsDisabled = false,
  onBattleClick,
  battleScreenActive = false,
}: GameHeaderProps) {
  const battleContextActive = isBattleContextActive(campaign)
  const battleHighlighted = activeTab === 'battle' || battleContextActive
  const battleTooltip = battleScreenActive
    ? 'Вы в бою'
    : battleHighlighted
      ? 'Экспедиция или бой в процессе'
      : 'Раздел боя и экспедиций'

  return (
    <header className="game-header">
      <div className="game-header__left">
        <span className="game-header__brand" aria-label="Gen">
          {UI_DNA} Gen
        </span>
        <CampaignHubNav
          activeTab={activeTab}
          onTabChange={onTabChange}
          unreadCodexCount={unreadCodexCount}
          codexDisabled={codexDisabled}
          shopDisabled={shopDisabled}
          tavernDisabled={tavernDisabled}
          tabsDisabled={tabsDisabled}
        />
      </div>
      <div className="game-header__right">
        <Tooltip title={GOLD_TOOLTIP} mouseEnterDelay={0.3}>
          <span className="game-header__resource">
            <span className="game-header__resource-emoji" aria-hidden>
              {UI_GOLD}
            </span>
            <strong>{campaign.gold}</strong>
          </span>
        </Tooltip>
        <Tooltip title={WORLD_POWER_TOOLTIP} mouseEnterDelay={0.3}>
          <span className="game-header__resource">
            <span className="game-header__resource-emoji" aria-hidden>
              {UI_WORLD_POWER}
            </span>
            <strong>{campaign.worldPower}</strong>
          </span>
        </Tooltip>
        <Tooltip title={battleTooltip} mouseEnterDelay={0.3}>
          <Button
            type={battleHighlighted ? 'primary' : 'default'}
            size="small"
            icon={<PlayCircleOutlined aria-hidden />}
            disabled={battleScreenActive}
            onClick={onBattleClick}
          >
            Бой
          </Button>
        </Tooltip>
      </div>
    </header>
  )
}
