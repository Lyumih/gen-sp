import type { ReactNode } from 'react'
import {
  BookOutlined,
  CoffeeOutlined,
  QuestionCircleOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Badge, Button, Space, Tooltip } from 'antd'
import type { CampaignHubTab } from './campaignHubShared'

type CampaignHubNavProps = {
  activeTab: CampaignHubTab
  onTabChange: (tab: CampaignHubTab) => void
  unreadCodexCount: number
  codexDisabled: boolean
  shopDisabled: boolean
  tavernDisabled: boolean
  tabsDisabled?: boolean
}

const TAB_ORDER: CampaignHubTab[] = ['character', 'shop', 'tavern', 'codex', 'help']

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
  battle: null,
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

export function CampaignHubNav({
  activeTab,
  onTabChange,
  unreadCodexCount,
  codexDisabled,
  shopDisabled,
  tavernDisabled,
  tabsDisabled = false,
}: CampaignHubNavProps) {
  return (
    <Space
      role="tablist"
      aria-label="Разделы кампании"
      wrap
      size={4}
    >
      {TAB_ORDER.map((tab) => {
        const button = (
          <Tooltip key={tab} title={TAB_LABEL[tab]} mouseEnterDelay={0.3}>
            <Button
              role="tab"
              aria-selected={activeTab === tab}
              aria-label={TAB_LABEL[tab]}
              type={activeTab === tab ? 'primary' : 'text'}
              size="large"
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
            />
          </Tooltip>
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
