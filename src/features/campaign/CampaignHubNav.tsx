import type { ReactNode } from 'react'
import {
  BookOutlined,
  CoffeeOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Badge, Button, Space } from 'antd'
import type { CampaignHubTab } from './campaignHubShared'

type CampaignHubNavProps = {
  activeTab: CampaignHubTab
  onTabChange: (tab: CampaignHubTab) => void
  unreadCodexCount: number
  codexDisabled: boolean
  shopDisabled: boolean
  tavernDisabled: boolean
  battleTabHighlighted?: boolean
  tabsDisabled?: boolean
}

const TAB_ORDER: CampaignHubTab[] = ['shop', 'character', 'battle', 'tavern', 'codex', 'help']

const TAB_LABEL: Record<CampaignHubTab, string> = {
  character: 'Персонаж',
  battle: 'Бой',
  shop: 'Магазин',
  codex: 'Кодекс',
  tavern: 'Таверна',
  help: 'Справка',
}

const TAB_ICON: Record<CampaignHubTab, ReactNode> = {
  character: <UserOutlined aria-hidden />,
  battle: <PlayCircleOutlined aria-hidden />,
  shop: <ShoppingOutlined aria-hidden />,
  codex: <BookOutlined aria-hidden />,
  tavern: <CoffeeOutlined aria-hidden />,
  help: <QuestionCircleOutlined aria-hidden />,
}

function isTabDisabled(
  tab: CampaignHubTab,
  codexDisabled: boolean,
  shopDisabled: boolean,
  tavernDisabled: boolean,
  tabsDisabled: boolean,
): boolean {
  if (tab === 'help') return false
  if (tabsDisabled) return true
  if (tab === 'codex') return codexDisabled
  if (tab === 'shop') return shopDisabled
  if (tab === 'tavern') return tavernDisabled
  return false
}

function tabButtonType(
  tab: CampaignHubTab,
  activeTab: CampaignHubTab,
  battleTabHighlighted: boolean,
): 'primary' | 'default' {
  if (tab === 'battle' && battleTabHighlighted) return 'primary'
  if (activeTab === tab) return 'primary'
  return 'default'
}

export function CampaignHubNav({
  activeTab,
  onTabChange,
  unreadCodexCount,
  codexDisabled,
  shopDisabled,
  tavernDisabled,
  battleTabHighlighted = false,
  tabsDisabled = false,
}: CampaignHubNavProps) {
  return (
    <Space
      role="tablist"
      aria-label="Разделы кампании"
      wrap
      size="middle"
      style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
    >
      {TAB_ORDER.map((tab) => {
        const button = (
          <Button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-label={TAB_LABEL[tab]}
            type={tabButtonType(tab, activeTab, battleTabHighlighted)}
            icon={TAB_ICON[tab]}
            disabled={
              isTabDisabled(
                tab,
                codexDisabled,
                shopDisabled,
                tavernDisabled,
                tabsDisabled,
              )
            }
            onClick={() => onTabChange(tab)}
          >
            {TAB_LABEL[tab]}
          </Button>
        )

        if (tab !== 'codex') return button
        return (
          <Badge key={tab} count={unreadCodexCount} size="small" showZero={false}>
            {button}
          </Badge>
        )
      })}
    </Space>
  )
}
