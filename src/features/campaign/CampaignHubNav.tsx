import type { ReactNode } from 'react'
import {
  BookOutlined,
  CoffeeOutlined,
  QuestionCircleOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Badge, Button, Space, Tooltip } from 'antd'
import type { CampaignHubTab, CampaignReferencePane } from './campaignHubShared'

type CampaignHubNavProps = {
  activeTab: CampaignHubTab
  onTabChange: (tab: CampaignHubTab) => void
  unreadCodexCount: number
  shopDisabled: boolean
  tavernDisabled: boolean
  tabsDisabled?: boolean
  referenceDrawerOpen: boolean
  referencePane: CampaignReferencePane
  onCodexClick: () => void
  onHelpClick: () => void
}

const CONTENT_TAB_ORDER: CampaignHubTab[] = ['character', 'shop', 'tavern']

const TAB_LABEL: Record<CampaignHubTab, string> = {
  character: 'Персонаж',
  battle: 'Бой',
  shop: 'Магазин',
  tavern: 'Таверна',
}

const TAB_ICON: Record<CampaignHubTab, ReactNode> = {
  character: <UserOutlined aria-hidden />,
  battle: null,
  shop: <ShoppingOutlined aria-hidden />,
  tavern: <CoffeeOutlined aria-hidden />,
}

function isContentTabDisabled(
  tab: CampaignHubTab,
  shopDisabled: boolean,
  tavernDisabled: boolean,
  tabsDisabled: boolean,
): boolean {
  if (tabsDisabled) return true
  if (tab === 'shop') return shopDisabled
  if (tab === 'tavern') return tavernDisabled
  return false
}

export function CampaignHubNav({
  activeTab,
  onTabChange,
  unreadCodexCount,
  shopDisabled,
  tavernDisabled,
  tabsDisabled = false,
  referenceDrawerOpen,
  referencePane,
  onCodexClick,
  onHelpClick,
}: CampaignHubNavProps) {
  return (
    <Space
      role="tablist"
      aria-label="Разделы кампании"
      wrap
      size={4}
    >
      {CONTENT_TAB_ORDER.map((tab) => (
        <Tooltip key={tab} title={TAB_LABEL[tab]} mouseEnterDelay={0.3}>
          <Button
            role="tab"
            aria-selected={activeTab === tab}
            aria-label={TAB_LABEL[tab]}
            type={activeTab === tab ? 'primary' : 'text'}
            size="large"
            icon={TAB_ICON[tab]}
            disabled={isContentTabDisabled(tab, shopDisabled, tavernDisabled, tabsDisabled)}
            onClick={() => onTabChange(tab)}
          />
        </Tooltip>
      ))}
      <Badge count={unreadCodexCount} size="small" showZero={false}>
        <Tooltip title="Кодекс" mouseEnterDelay={0.3}>
          <Button
            aria-label="Кодекс"
            aria-expanded={referenceDrawerOpen && referencePane === 'codex'}
            type={referenceDrawerOpen && referencePane === 'codex' ? 'primary' : 'text'}
            size="large"
            icon={<BookOutlined aria-hidden />}
            onClick={onCodexClick}
          />
        </Tooltip>
      </Badge>
      <Tooltip title="Справка" mouseEnterDelay={0.3}>
        <Button
          aria-label="Справка"
          aria-expanded={referenceDrawerOpen && referencePane === 'help'}
          type={referenceDrawerOpen && referencePane === 'help' ? 'primary' : 'text'}
          size="large"
          icon={<QuestionCircleOutlined aria-hidden />}
          onClick={onHelpClick}
        />
      </Tooltip>
    </Space>
  )
}
