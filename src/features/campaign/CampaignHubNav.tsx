import type { ReactNode } from 'react'
import {
  BookOutlined,
  CoffeeOutlined,
  PlayCircleOutlined,
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
}

const TAB_ORDER: CampaignHubTab[] = ['character', 'battle', 'shop', 'tavern', 'codex']

const TAB_LABEL: Record<CampaignHubTab, string> = {
  character: 'Персонаж',
  battle: 'Бой',
  shop: 'Магазин',
  codex: 'Кодекс',
  tavern: 'Таверна',
}

const TAB_ICON: Record<CampaignHubTab, ReactNode> = {
  character: <UserOutlined aria-hidden />,
  battle: <PlayCircleOutlined aria-hidden />,
  shop: <ShoppingOutlined aria-hidden />,
  codex: <BookOutlined aria-hidden />,
  tavern: <CoffeeOutlined aria-hidden />,
}

function isTabDisabled(
  tab: CampaignHubTab,
  codexDisabled: boolean,
  shopDisabled: boolean,
  tavernDisabled: boolean,
): boolean {
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
            type={activeTab === tab ? 'primary' : 'default'}
            icon={TAB_ICON[tab]}
            disabled={isTabDisabled(tab, codexDisabled, shopDisabled, tavernDisabled)}
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
