import type { ReactNode } from 'react'
import { PlayCircleOutlined, ShoppingOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Space } from 'antd'
import type { CampaignHubTab } from './campaignHubShared'

type CampaignHubNavProps = {
  activeTab: CampaignHubTab
  onTabChange: (tab: CampaignHubTab) => void
}

const TAB_ORDER: CampaignHubTab[] = ['character', 'battle', 'shop']

const TAB_LABEL: Record<CampaignHubTab, string> = {
  character: 'Персонаж',
  battle: 'Бой',
  shop: 'Магазин',
}

const TAB_ICON: Record<CampaignHubTab, ReactNode> = {
  character: <UserOutlined aria-hidden />,
  battle: <PlayCircleOutlined aria-hidden />,
  shop: <ShoppingOutlined aria-hidden />,
}

export function CampaignHubNav({ activeTab, onTabChange }: CampaignHubNavProps) {
  return (
    <Space
      role="tablist"
      aria-label="Разделы кампании"
      wrap
      size="middle"
      style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
    >
      {TAB_ORDER.map((tab) => (
        <Button
          key={tab}
          role="tab"
          aria-selected={activeTab === tab}
          aria-label={TAB_LABEL[tab]}
          type={activeTab === tab ? 'primary' : 'default'}
          icon={TAB_ICON[tab]}
          onClick={() => onTabChange(tab)}
        >
          {TAB_LABEL[tab]}
        </Button>
      ))}
    </Space>
  )
}
