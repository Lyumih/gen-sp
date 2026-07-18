import { Typography } from 'antd'
import type { CampaignState } from '../../game/types'
import { getItemTemplate } from '../../game/content/itemTemplates'
import { UI_HEART } from '../../game/ui/labels'
import { previewShopItemEquipDelta } from './previewShopItemDelta'

type ShopEquipPreviewProps = {
  campaign: CampaignState
  characterId: string
  templateId: string
}

export function ShopEquipPreview({ campaign, characterId, templateId }: ShopEquipPreviewProps) {
  const delta = previewShopItemEquipDelta(campaign, characterId, templateId, getItemTemplate)
  if (!delta) return null

  const parts: string[] = []
  if (delta.deltaMaxHp !== 0) {
    parts.push(
      `${UI_HEART} ${delta.deltaMaxHp >= 0 ? '+' : ''}${delta.deltaMaxHp} при экипировке`,
    )
  }
  if (Math.abs(delta.deltaDamageMult) > 0.0001) {
    const pct = Math.round(delta.deltaDamageMult * 100)
    parts.push(`💥 ${pct >= 0 ? '+' : ''}${pct}% при экипировке`)
  }
  if (parts.length === 0) return null

  return (
    <Typography.Text type="success" style={{ fontSize: 12, display: 'block' }}>
      {parts.join(' · ')}
    </Typography.Text>
  )
}
