import { useEffect, useState } from 'react'
import { Button, Space, Typography } from 'antd'
import { SKILL_ACQUISITION } from '../../game/config/skillAcquisition'
import { getCardDisplayLabel } from '../../game/descriptions/cardText'
import {
  itemInstanceDescriptionLinesFromInstance,
  itemPriceLine,
  itemSellPrice,
} from '../../game/descriptions/itemText'
import { getCharacter } from '../../game/character/selectors'
import { stashItemsFromCampaign } from '../../game/equipment/stashOrder'
import { getItemTemplate } from '../../game/content/itemTemplates'
import type { CampaignState, EquipmentSlot, ItemInstance } from '../../game/types'
import { CharacterRosterView } from '../character/CharacterRosterView'
import { ChestInventoryView } from '../inventory/ChestInventoryView'
import { EquipmentSlotRow } from '../inventory/EquipmentSlotRow'
import { InventoryCell } from '../inventory/InventoryCell'
import { InventoryGrid } from '../inventory/InventoryGrid'
import { ItemPopoverActions } from '../inventory/ItemPopoverActions'
import { ShopOffersGrid } from '../inventory/ShopOffersGrid'
import { resolveItemEmoji } from '../inventory/inventoryEmoji'
import { GameColumns } from '../layout/GameColumns'
import { GamePanel } from '../layout/GamePanel'
import { StatStrip } from '../stats/StatStrip'
import { UI_LEVEL } from '../../game/ui/labels'
import '../inventory/inventory.css'

function shopStashItemPopover(
  item: ItemInstance,
  inBattle: boolean,
  onSell: () => void,
) {
  const tmpl = getItemTemplate(item.templateId)
  const sellPrice = tmpl ? itemSellPrice(tmpl) : 0
  const lines = itemInstanceDescriptionLinesFromInstance(item, getItemTemplate)
  return (
    <Space orientation="vertical" size="small" style={{ maxWidth: 320 }}>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {lines.map((line, idx) => (
          <li key={idx}>
            <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
          </li>
        ))}
      </ul>
      {sellPrice > 0 ? (
        <Typography.Text style={{ fontSize: 12 }}>{itemPriceLine(sellPrice)}</Typography.Text>
      ) : null}
      <ItemPopoverActions
        inBattle={inBattle}
        actions={[
          {
            key: 'sell',
            label: 'Продать',
            danger: true,
            disabled: sellPrice <= 0,
            onClick: onSell,
          },
        ]}
      />
    </Space>
  )
}

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
  onSellChestCard: (cardId: string) => void
  onSellChestPassive: (passiveId: string) => void
  onSellItem: (characterId: string, itemId: string) => void
  onBindChestCard: (cardId: string, characterId: string) => void
  onBindChestPassive: (passiveId: string, characterId: string) => void
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
  onSellChestCard,
  onSellChestPassive,
  onSellItem,
  onBindChestCard,
  onBindChestPassive,
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
    <Space orientation="vertical" size="small" style={{ width: '100%' }} role="tabpanel">
      <GamePanel
        title="Магазин"
        extra={
          <Button
            size="small"
            disabled={inBattle || campaign.expedition !== null}
            onClick={() => onRefreshShop(false)}
          >
            Обновить ({SKILL_ACQUISITION.shopRefreshCost} 💰)
          </Button>
        }
      >
        <ShopOffersGrid
          offers={offers}
          gold={campaign.gold}
          inBattle={inBattle}
          selectedCharacterName={selected.name}
          selectedCharacterId={selected.id}
          onBuy={onBuyOffer}
          onInsufficientGold={onInsufficientGold}
        />
      </GamePanel>

      <GameColumns>
        <GamePanel title="Персонаж">
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
          <Typography.Text strong style={{ display: 'block', marginTop: 8 }}>
            {selected.name}
          </Typography.Text>
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
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            Карты:{' '}
            {selected.cards.map((c) => getCardDisplayLabel(c.templateId)).join(' · ') || '—'}
          </Typography.Text>
          <InventoryGrid
            itemCount={stash.length}
            renderCell={(index, isEmpty) => {
              if (isEmpty) return <InventoryCell state="empty" ariaLabel="Пустой слот" />
              const item = stash[index]!
              const tmpl = getItemTemplate(item.templateId)
              const sellPrice = tmpl ? itemSellPrice(tmpl) : 0
              return (
                <InventoryCell
                  key={item.id}
                  emoji={resolveItemEmoji(tmpl, tmpl?.slot ?? 'weapon')}
                  levelBadge={`${UI_LEVEL}${item.itemLevel}`}
                  contextBadge={sellPrice > 0 ? `${sellPrice} 💰` : undefined}
                  state={inBattle ? 'disabled' : 'filled'}
                  popoverTitle={tmpl?.label}
                  popoverContent={shopStashItemPopover(item, inBattle, () =>
                    onSellItem(selected.id, item.id),
                  )}
                  ariaLabel={tmpl?.label ?? item.templateId}
                />
              )
            }}
          />
        </GamePanel>

        <GamePanel title="Сундук">
          <ChestInventoryView
            campaign={campaign}
            inBattle={inBattle}
            inventoryLocked={campaign.expedition !== null}
            bindCharacterId={selected.id}
            onSellChestItem={onSellChestItem}
            onSellChestCard={onSellChestCard}
            onSellChestPassive={onSellChestPassive}
            bindCharacterName={selected.name}
            onBindCard={(cardId) => onBindChestCard(cardId, selected.id)}
            onBindPassive={(passiveId) => onBindChestPassive(passiveId, selected.id)}
            onAssignItemToCharacter={
              onMoveChestItemToCharacter
                ? (itemId) => onMoveChestItemToCharacter(itemId, selected.id)
                : undefined
            }
          />
        </GamePanel>
      </GameColumns>
    </Space>
  )
}
