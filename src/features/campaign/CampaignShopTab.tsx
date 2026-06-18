import { Divider, Space, Typography } from 'antd'
import { HeroProfileContent } from '../profile/HeroProfileContent'
import type { CampaignState } from '../../game/types'
import { ShopInventoryView } from '../inventory/ShopInventoryView'
import '../inventory/inventory.css'

type CampaignShopTabProps = {
  campaign: CampaignState
  inBattle: boolean
  onBuy: (templateId: string) => void
  onInsufficientGold: () => void
  onSell: (itemId: string) => void
}

export function CampaignShopTab({
  campaign,
  inBattle,
  onBuy,
  onInsufficientGold,
  onSell,
}: CampaignShopTabProps) {
  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }} role="tabpanel">
      <HeroProfileContent
        mode="hub"
        campaign={campaign}
        battle={null}
        includeResourceStats={false}
        includeEquipmentReadout
        includeCardsCollapse={false}
      />

      <Divider style={{ margin: '8px 0' }} />

      <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 0 }}>
        Магазин
      </Typography.Title>

      <ShopInventoryView
        campaign={campaign}
        inBattle={inBattle}
        onBuy={onBuy}
        onInsufficientGold={onInsufficientGold}
        onSell={onSell}
      />
    </Space>
  )
}
