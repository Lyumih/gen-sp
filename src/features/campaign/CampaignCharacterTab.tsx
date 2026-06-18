import { Divider, Space, Typography } from 'antd'
import { HeroProfileContent } from '../profile/HeroProfileContent'
import { aggregateGearCardLevelBonus } from '../../game/equipment/aggregates'
import { getItemTemplate } from '../../game/content/itemTemplates'
import type { CampaignState, EquipmentSlot } from '../../game/types'
import { CardsInventoryView } from '../inventory/CardsInventoryView'
import { EquipmentInventoryView } from '../inventory/EquipmentInventoryView'
import '../inventory/inventory.css'

type CampaignCharacterTabProps = {
  campaign: CampaignState
  inBattle: boolean
  onEquip: (itemId: string, slot: EquipmentSlot) => void
  onUnequip: (slot: EquipmentSlot) => void
  onReorderStash: (itemIds: string[]) => void
  onReorderCards: (cardIds: string[]) => void
  onSetModKillTarget: (cardId: string) => void
  onSetBattleLoadout: (slotIndex: 0 | 1, cardId: string | null) => void
  onInvalidSlot: () => void
}

export function CampaignCharacterTab({
  campaign,
  inBattle,
  onEquip,
  onUnequip,
  onReorderStash,
  onReorderCards,
  onSetModKillTarget,
  onSetBattleLoadout,
  onInvalidSlot,
}: CampaignCharacterTabProps) {
  const gearCardPreview = aggregateGearCardLevelBonus(
    campaign.items,
    campaign.equipment,
    getItemTemplate,
  )

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }} role="tabpanel">
      <HeroProfileContent
        mode="hub"
        campaign={campaign}
        battle={null}
        includeResourceStats={false}
        includeEquipmentReadout={false}
        includeCardsCollapse={false}
      />

      <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 0 }}>
        Инвентарь и экипировка
      </Typography.Title>
      <Divider style={{ margin: '8px 0 16px' }} />

      <EquipmentInventoryView
        campaign={campaign}
        inBattle={inBattle}
        onEquip={onEquip}
        onUnequip={onUnequip}
        onReorderStash={onReorderStash}
        onInvalidSlot={onInvalidSlot}
      />

      <div>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          <span style={{ fontSize: 28, lineHeight: 1, verticalAlign: '-0.18em' }} aria-hidden>
            🃏
          </span>{' '}
          Карточки
        </Typography.Text>
        <CardsInventoryView
          campaign={campaign}
          inBattle={inBattle}
          gearCardLevelBonus={gearCardPreview}
          onReorderCards={onReorderCards}
          onSetModKillTarget={onSetModKillTarget}
          onSetBattleLoadout={onSetBattleLoadout}
        />
      </div>
    </Space>
  )
}
