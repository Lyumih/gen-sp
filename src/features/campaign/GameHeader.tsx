import { FlagOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { Button, Space, Tooltip, Typography } from 'antd'
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
  onGoalsClick?: () => void
  showGoalsButton?: boolean
}

function HeaderResource({
  emoji,
  value,
  tooltip,
}: {
  emoji: string
  value: number
  tooltip: string
}) {
  return (
    <Tooltip title={tooltip} mouseEnterDelay={0.3}>
      <Space size={4} align="center">
        <span className="game-header__resource-emoji" aria-hidden>
          {emoji}
        </span>
        <Typography.Text strong>{value}</Typography.Text>
      </Space>
    </Tooltip>
  )
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
  onGoalsClick,
  showGoalsButton = false,
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
      <div className="game-header__inner">
        <div className="game-header__brand">
          <Typography.Text strong>{UI_DNA} Gen</Typography.Text>
        </div>

        <div className="game-header__nav">
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

        <div className="game-header__actions">
          <Space size="middle" align="center" wrap={false}>
            <HeaderResource
              emoji={UI_GOLD}
              value={campaign.gold}
              tooltip={GOLD_TOOLTIP}
            />
            <HeaderResource
              emoji={UI_WORLD_POWER}
              value={campaign.worldPower}
              tooltip={WORLD_POWER_TOOLTIP}
            />
            {showGoalsButton ? (
              <Tooltip title="Цели обучения" mouseEnterDelay={0.3}>
                <Button
                  size="large"
                  icon={<FlagOutlined aria-hidden />}
                  aria-label="Цели"
                  onClick={onGoalsClick}
                />
              </Tooltip>
            ) : null}
            <Tooltip title={battleTooltip} mouseEnterDelay={0.3}>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined aria-hidden />}
                disabled={battleScreenActive}
                onClick={onBattleClick}
              >
                Бой
              </Button>
            </Tooltip>
          </Space>
        </div>
      </div>
    </header>
  )
}
