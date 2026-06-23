import { PlayCircleOutlined } from '@ant-design/icons'
import { Button, Flex, Space, Tooltip, Typography } from 'antd'
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
      <Flex align="center" gap="middle" style={{ width: '100%' }}>
        <Flex flex={1} align="center" style={{ minWidth: 0 }}>
          <Typography.Text strong className="game-header__brand">
            {UI_DNA} Gen
          </Typography.Text>
        </Flex>

        <CampaignHubNav
          activeTab={activeTab}
          onTabChange={onTabChange}
          unreadCodexCount={unreadCodexCount}
          codexDisabled={codexDisabled}
          shopDisabled={shopDisabled}
          tavernDisabled={tavernDisabled}
          tabsDisabled={tabsDisabled}
        />

        <Flex flex={1} align="center" justify="flex-end" style={{ minWidth: 0 }}>
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
            <Tooltip title={battleTooltip} mouseEnterDelay={0.3}>
              <Button
                type="primary"
                size="small"
                icon={<PlayCircleOutlined aria-hidden />}
                disabled={battleScreenActive}
                onClick={onBattleClick}
              >
                Бой
              </Button>
            </Tooltip>
          </Space>
        </Flex>
      </Flex>
    </header>
  )
}
