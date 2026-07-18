import { Radio, Space, Typography } from 'antd'
import { useState } from 'react'
import { SKILL_ACQUISITION } from '../../game/config/skillAcquisition'
import { getCardAttackTemplate } from '../../game/content/cardTemplates'
import { getPassiveTemplate } from '../../game/content/passiveTemplates'
import { getCardDisplayLabel } from '../../game/descriptions/cardText'
import { getPassiveDisplayLabel } from '../../game/descriptions/passiveText'
import {
  equipmentSlotLabelRu,
  itemPerLevelBonusesLines,
  itemPriceLine,
} from '../../game/descriptions/itemText'
import { getItemTemplate } from '../../game/content/itemTemplates'
import type { CampaignState, ShopOffer } from '../../game/types'
import { ItemPopoverActions } from './ItemPopoverActions'
import { InventoryCell } from './InventoryCell'
import { InventoryGrid } from './InventoryGrid'
import { resolveCardEmoji, resolveItemEmoji, resolvePassiveEmoji } from './inventoryEmoji'
import { ShopEquipPreview } from './ShopEquipPreview'

type ShopOffersGridProps = {
  campaign: CampaignState
  offers: ShopOffer[]
  gold: number
  inBattle: boolean
  selectedCharacterName: string
  onBuy: (
    offerIndex: number,
    destination?: 'chest' | 'character',
    characterId?: string,
  ) => void
  selectedCharacterId: string
  onInsufficientGold: () => void
}

function ItemBuyPopover({
  templateId,
  inBattle,
  canBuy,
  selectedCharacterName,
  destination,
  onDestinationChange,
  onBuy,
  campaign,
  characterId,
}: {
  templateId: string
  inBattle: boolean
  canBuy: boolean
  selectedCharacterName: string
  destination: 'chest' | 'character'
  onDestinationChange: (d: 'chest' | 'character') => void
  onBuy: () => void
  campaign: CampaignState
  characterId: string
}) {
  const t = getItemTemplate(templateId)!
  return (
    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        <li>
          <Typography.Text style={{ fontSize: 12 }}>
            {equipmentSlotLabelRu(t.slot)} · {itemPerLevelBonusesLines(t).join(' · ')}
          </Typography.Text>
        </li>
      </ul>
      <ShopEquipPreview campaign={campaign} characterId={characterId} templateId={templateId} />
      <Typography.Text style={{ fontSize: 12 }}>{itemPriceLine(t.shopPrice)}</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
        На персонажа — в инвентарь; наденьте в слот вручную. Сундук — общий склад.
      </Typography.Text>
      <Radio.Group
        value={destination}
        onChange={(e) => onDestinationChange(e.target.value)}
        style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
      >
        <Radio value="character">Персонаж: {selectedCharacterName}</Radio>
        <Radio value="chest">Сундук</Radio>
      </Radio.Group>
      <ItemPopoverActions
        inBattle={inBattle}
        actions={[
          {
            key: 'buy',
            label: 'Купить',
            type: 'primary',
            disabled: !canBuy,
            onClick: onBuy,
          },
        ]}
      />
    </Space>
  )
}

export function ShopOffersGrid({
  campaign,
  offers,
  gold,
  inBattle,
  selectedCharacterName,
  onBuy,
  selectedCharacterId,
  onInsufficientGold,
}: ShopOffersGridProps) {
  const [itemDestination, setItemDestination] = useState<'chest' | 'character'>('character')

  if (offers.length === 0) {
    return (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Ассортимент пуст — нажмите «Обновить».
      </Typography.Text>
    )
  }

  return (
    <InventoryGrid
      itemCount={offers.length}
      minRows={1}
      renderCell={(index, isEmpty) => {
        if (isEmpty) {
          return <InventoryCell state="empty" ariaLabel="Пустой слот магазина" />
        }
        const offer = offers[index]!
        if (offer.kind === 'skill') {
          const tmpl = getCardAttackTemplate(offer.templateId)
          const price = SKILL_ACQUISITION.shopSkillPrice
          const canBuy = gold >= price
          return (
            <InventoryCell
              key={`skill-${index}`}
              emoji={resolveCardEmoji(tmpl)}
              contextBadge={`${price} 💰`}
              className="inv-cell--skill-offer"
              state={inBattle ? 'disabled' : canBuy ? 'filled' : 'disabled'}
              popoverTitle={`Умение: ${getCardDisplayLabel(offer.templateId)}`}
              popoverContent={
                <Space orientation="vertical" size="small">
                  <Typography.Text style={{ fontSize: 12 }}>
                    Покупка → сундук. Уровень 1.
                  </Typography.Text>
                  <Typography.Text style={{ fontSize: 12 }}>{itemPriceLine(price)}</Typography.Text>
                  <ItemPopoverActions
                    inBattle={inBattle}
                    actions={[
                      {
                        key: 'buy',
                        label: 'Купить',
                        type: 'primary',
                        disabled: !canBuy,
                        onClick: () => {
                          if (!canBuy) {
                            onInsufficientGold()
                            return
                          }
                          onBuy(index)
                        },
                      },
                    ]}
                  />
                </Space>
              }
              onDoubleClick={() => {
                if (!canBuy) {
                  onInsufficientGold()
                  return
                }
                onBuy(index)
              }}
              ariaLabel={getCardDisplayLabel(offer.templateId)}
            />
          )
        }
        if (offer.kind === 'passive') {
          const tmpl = getPassiveTemplate(offer.templateId)
          const price = SKILL_ACQUISITION.shopPassivePrice
          const canBuy = gold >= price
          const label = getPassiveDisplayLabel(offer.templateId)
          return (
            <InventoryCell
              key={`passive-${index}`}
              emoji={resolvePassiveEmoji(tmpl)}
              contextBadge={`${price} 💰`}
              className="inv-cell--passive-offer"
              state={inBattle ? 'disabled' : canBuy ? 'filled' : 'disabled'}
              popoverTitle={`Навык: ${label}`}
              popoverContent={
                <Space orientation="vertical" size="small">
                  <Typography.Text style={{ fontSize: 12 }}>
                    Покупка → сундук. Уровень 1. Привязка к герою необратима.
                  </Typography.Text>
                  <Typography.Text style={{ fontSize: 12 }}>{itemPriceLine(price)}</Typography.Text>
                  <ItemPopoverActions
                    inBattle={inBattle}
                    actions={[
                      {
                        key: 'buy',
                        label: 'Купить',
                        type: 'primary',
                        disabled: !canBuy,
                        onClick: () => {
                          if (!canBuy) {
                            onInsufficientGold()
                            return
                          }
                          onBuy(index)
                        },
                      },
                    ]}
                  />
                </Space>
              }
              onDoubleClick={() => {
                if (!canBuy) {
                  onInsufficientGold()
                  return
                }
                onBuy(index)
              }}
              ariaLabel={label}
            />
          )
        }
        const t = getItemTemplate(offer.templateId)!
        const canBuy = gold >= t.shopPrice
        return (
          <InventoryCell
            key={`item-${index}`}
            emoji={resolveItemEmoji(t, t.slot)}
            contextBadge={`${t.shopPrice} 💰`}
            state={inBattle ? 'disabled' : canBuy ? 'filled' : 'disabled'}
            popoverTitle={t.label}
            popoverContent={
              <ItemBuyPopover
                templateId={offer.templateId}
                inBattle={inBattle}
                canBuy={canBuy}
                selectedCharacterName={selectedCharacterName}
                destination={itemDestination}
                onDestinationChange={setItemDestination}
                campaign={campaign}
                characterId={selectedCharacterId}
                onBuy={() => {
                  if (!canBuy) {
                    onInsufficientGold()
                    return
                  }
                  onBuy(
                    index,
                    itemDestination,
                    itemDestination === 'character' ? selectedCharacterId : undefined,
                  )
                }}
              />
            }
            onDoubleClick={() => {
              if (!canBuy) {
                onInsufficientGold()
                return
              }
              onBuy(index, itemDestination, itemDestination === 'character' ? selectedCharacterId : undefined)
            }}
            ariaLabel={t.label}
          />
        )
      }}
    />
  )
}
