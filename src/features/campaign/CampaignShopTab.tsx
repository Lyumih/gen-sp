import { useEffect, useState } from 'react'
import { Button, Divider, Space, Typography } from 'antd'
import { SKILL_ACQUISITION } from '../../game/config/skillAcquisition'
import { getCardDisplayLabel } from '../../game/descriptions/cardText'
import { getCharacter } from '../../game/character/selectors'
import { stashItemsFromCampaign } from '../../game/equipment/stashOrder'
import { getItemTemplate } from '../../game/content/itemTemplates'
import type { CampaignState, EquipmentSlot } from '../../game/types'
import { CharacterRosterView } from '../character/CharacterRosterView'
import { ChestInventoryView } from '../inventory/ChestInventoryView'
import { EquipmentSlotRow } from '../inventory/EquipmentSlotRow'
import { InventoryCell } from '../inventory/InventoryCell'
import { InventoryGrid } from '../inventory/InventoryGrid'
import { ShopOffersGrid } from '../inventory/ShopOffersGrid'
import { resolveItemEmoji } from '../inventory/inventoryEmoji'
import { StatStrip } from '../stats/StatStrip'
import '../inventory/inventory.css'

type CampaignShopTabProps = {
  campaign: CampaignState
  inBattle: boolean
  onRefreshShop: (free?: boolean) => void
  onBuyOffer: (
    offerIndex: number,
    destination?: 'chest' | 'character',
    characterId?: string,
  ) => void
  onInsufficientGold: () => void
  onSellChestItem: (itemId: string) => void
  onBindChestCard: (cardId: string, characterId: string) => void
  onMoveChestItemToCharacter?: (itemId: string, characterId: string) => void
  onUnequip: (characterId: string, slot: EquipmentSlot) => void
}

export function CampaignShopTab({
  campaign,
  inBattle,
  onRefreshShop,
  onBuyOffer,
  onInsufficientGold,
  onSellChestItem,
  onBindChestCard,
  onMoveChestItemToCharacter,
  onUnequip,
}: CampaignShopTabProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    () => campaign.characters[0]?.id ?? '',
  )

  useEffect(() => {
    if (campaign.shopOffers === null && !inBattle && campaign.expedition === null) {
      onRefreshShop(true)
    }
  }, [campaign.shopOffers, inBattle, campaign.expedition, onRefreshShop])

  const selected = getCharacter(campaign, selectedCharacterId) ?? campaign.characters[0]!
  const stash = stashItemsFromCampaign(selected.items, selected.equipment)
  const offers = campaign.shopOffers ?? []

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }} role="tabpanel">
      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Магазин
        </Typography.Title>
        <Button
          size="small"
          disabled={inBattle || campaign.expedition !== null}
          onClick={() => onRefreshShop(false)}
        >
          Обновить ({SKILL_ACQUISITION.shopRefreshCost} 💰)
        </Button>
      </Space>

      <ShopOffersGrid
        offers={offers}
        gold={campaign.gold}
        inBattle={inBattle}
        selectedCharacterName={selected.name}
        selectedCharacterId={selected.id}
        onBuy={onBuyOffer}
        onInsufficientGold={onInsufficientGold}
      />

      <Divider style={{ margin: '8px 0' }} />

      <Typography.Title level={5} style={{ margin: 0 }}>
        Состав
      </Typography.Title>
      <CharacterRosterView
        campaign={campaign}
        selectedCharacterId={selectedCharacterId}
        inventoryCharacterId={selectedCharacterId}
        transferDisabled
        squadLocked
        activeDragId={null}
        onSelectCharacter={setSelectedCharacterId}
        onAssignToSquad={() => {}}
        onRemoveFromSquad={() => {}}
        showSquadActions={false}
      />

      <Typography.Title level={5} style={{ margin: 0 }}>
        {selected.name}
      </Typography.Title>
      <StatStrip
        baseStats={selected.baseStats}
        baseStatRating={selected.baseStatRating}
        showRating
      />
      <EquipmentSlotRow
        character={selected}
        inBattle={inBattle}
        onUnequip={(slot) => onUnequip(selected.id, slot)}
      />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Карты:{' '}
        {selected.cards.map((c) => getCardDisplayLabel(c.templateId)).join(' · ') || '—'}
      </Typography.Text>

      <Typography.Title level={5} style={{ margin: 0 }}>
        Инвентарь — {selected.name}
      </Typography.Title>
      <InventoryGrid
        itemCount={stash.length}
        renderCell={(index, isEmpty) => {
          if (isEmpty) return <InventoryCell state="empty" ariaLabel="Пустой слот" />
          const item = stash[index]!
          const tmpl = getItemTemplate(item.templateId)
          return (
            <InventoryCell
              key={item.id}
              emoji={resolveItemEmoji(tmpl, tmpl?.slot ?? 'weapon')}
              state={inBattle ? 'disabled' : 'filled'}
              popoverTitle={tmpl?.label}
              ariaLabel={tmpl?.label ?? item.templateId}
            />
          )
        }}
      />

      <Typography.Title level={5} style={{ margin: 0 }}>
        Сундук
      </Typography.Title>
      <ChestInventoryView
        campaign={campaign}
        inBattle={inBattle}
        onSellChestItem={onSellChestItem}
        bindCharacterName={selected.name}
        onBindCard={(cardId) => onBindChestCard(cardId, selected.id)}
        onAssignItemToCharacter={
          onMoveChestItemToCharacter
            ? (itemId) => onMoveChestItemToCharacter(itemId, selected.id)
            : undefined
        }
      />
    </Space>
  )
}
