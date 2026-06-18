import { Button, Card, Divider, Space, Typography } from 'antd'
import { HeroProfileContent } from '../profile/HeroProfileContent'
import {
  equipmentSlotLabelRu,
  itemPerLevelBonusesLines,
} from '../../game/descriptions/itemText'
import { ITEM_TEMPLATES, SHOP_TEMPLATE_IDS } from '../../game/content/itemTemplates'
import type { CampaignState } from '../../game/types'
import { UI_LEVEL } from '../../game/ui/labels'
import { getStashItems } from './campaignHubShared'
import { CampaignStashLine } from './CampaignStashLine'

type CampaignShopTabProps = {
  campaign: CampaignState
  inBattle: boolean
  onBuy: (templateId: string) => void
}

export function CampaignShopTab({ campaign, inBattle, onBuy }: CampaignShopTabProps) {
  const stash = getStashItems(campaign)

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

      <CampaignStashLine stash={stash} />

      <Divider style={{ margin: '8px 0' }} />

      <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 0 }}>
        Магазин
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 12 }}>
        Новый предмет стартует с {UI_LEVEL}1; {UI_LEVEL} может расти после побед в сценарии
        (Memento).
      </Typography.Paragraph>
      <Space wrap size="middle">
        {SHOP_TEMPLATE_IDS.map((tid) => {
          const t = ITEM_TEMPLATES[tid]!
          const can = campaign.gold >= t.shopPrice && !inBattle
          return (
            <Card key={tid} size="small" style={{ maxWidth: 280 }}>
              <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                <Typography.Text strong>{t.label}</Typography.Text>
                <Typography.Text type="secondary">
                  {equipmentSlotLabelRu(t.slot)} · {t.shopPrice} зол.
                </Typography.Text>
                <Typography.Text style={{ fontSize: 12 }}>
                  На {UI_LEVEL}1:{' '}
                  {itemPerLevelBonusesLines(t)
                    .filter((line) => !line.startsWith('Нет бонусов'))
                    .join(' · ') || 'нет бонусов'}
                </Typography.Text>
                <Button type="primary" disabled={!can} block onClick={() => onBuy(tid)}>
                  Купить
                </Button>
              </Space>
            </Card>
          )
        })}
      </Space>
    </Space>
  )
}
