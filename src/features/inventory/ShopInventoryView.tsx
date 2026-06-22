import { useState } from 'react'
import { Button, Space, Tooltip, Typography } from 'antd'
import { SHOP_TEMPLATE_IDS, getItemTemplate } from '../../game/content/itemTemplates'
import {
  equipmentSlotLabelRu,
  itemInstanceDescriptionLinesFromInstance,
  itemPerLevelBonusesLines,
  itemPriceLine,
  itemSellPrice,
} from '../../game/descriptions/itemText'
import { getPrimaryCharacter } from '../../game/campaign/selectors'
import type { CampaignState, ItemInstance } from '../../game/types'
import { UI_LEVEL } from '../../game/ui/labels'
import { stashItemsFromCampaign } from '../../game/equipment/stashOrder'
import { ItemPopoverActions } from './ItemPopoverActions'
import { InventoryCell } from './InventoryCell'
import { InventoryGrid } from './InventoryGrid'
import { resolveItemEmoji } from './inventoryEmoji'
import './inventory.css'

type ShopInventoryViewProps = {
  campaign: CampaignState
  inBattle: boolean
  onBuy: (templateId: string) => void
  onInsufficientGold: () => void
  onSell: (itemId: string) => void
}

function shopTemplatePopover(
  templateId: string,
  inBattle: boolean,
  canBuy: boolean,
  onBuy: () => void,
) {
  const t = getItemTemplate(templateId)!
  return (
    <Space orientation="vertical" size="small" style={{ maxWidth: 280 }}>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        <li>
          <Typography.Text style={{ fontSize: 12 }}>
            {equipmentSlotLabelRu(t.slot)} · {itemPerLevelBonusesLines(t).join(' · ')}
          </Typography.Text>
        </li>
      </ul>
      <Typography.Text style={{ fontSize: 12 }}>{itemPriceLine(t.shopPrice)}</Typography.Text>
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

function shopStashPopover(
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
      {tmpl ? (
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

function ShopTemplateCell({
  templateId,
  inBattle,
  canBuy,
  onDoubleClick,
  onBuy,
}: {
  templateId: string
  inBattle: boolean
  canBuy: boolean
  onDoubleClick: () => void
  onBuy: () => void
}) {
  const t = getItemTemplate(templateId)!
  return (
    <InventoryCell
      emoji={resolveItemEmoji(t, t.slot)}
      contextBadge={`${t.shopPrice} 💰`}
      state={inBattle ? 'disabled' : canBuy ? 'filled' : 'disabled'}
      popoverTitle={t.label}
      popoverContent={shopTemplatePopover(templateId, inBattle, canBuy, onBuy)}
      popoverTrigger="hover"
      ariaLabel={`${t.label}, ${t.shopPrice} 💰`}
      onDoubleClick={onDoubleClick}
    />
  )
}

function StashPreviewCell({
  item,
  inBattle,
  onSell,
  quickSellMode,
  selected,
  onCellClick,
}: {
  item: ItemInstance
  inBattle: boolean
  onSell: () => void
  quickSellMode: boolean
  selected: boolean
  onCellClick: () => void
}) {
  const t = getItemTemplate(item.templateId)
  return (
    <InventoryCell
      emoji={resolveItemEmoji(t, t?.slot ?? 'weapon')}
      levelBadge={`${UI_LEVEL}${item.itemLevel}`}
      contextBadge={t ? `${itemSellPrice(t)} 💰` : undefined}
      state={inBattle ? 'disabled' : 'filled'}
      className={selected ? 'inv-cell--selected' : undefined}
      popoverTitle={t?.label}
      popoverContent={shopStashPopover(item, inBattle, onSell)}
      ariaLabel={t?.label ?? item.templateId}
      onClick={
        quickSellMode
          ? (e) => {
              e.stopPropagation()
              onCellClick()
            }
          : undefined
      }
    />
  )
}

function totalSellPriceForIds(
  ids: Set<string>,
  stash: ItemInstance[],
): number {
  let sum = 0
  for (const id of ids) {
    const item = stash.find((i) => i.id === id)
    if (!item) continue
    const t = getItemTemplate(item.templateId)
    if (t) sum += itemSellPrice(t)
  }
  return sum
}

export function ShopInventoryView({
  campaign,
  inBattle,
  onBuy,
  onInsufficientGold,
  onSell,
}: ShopInventoryViewProps) {
  const hero = getPrimaryCharacter(campaign)
  const stash = stashItemsFromCampaign(hero.items, hero.equipment)
  const [quickSellMode, setQuickSellMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  function tryBuy(templateId: string) {
    const t = getItemTemplate(templateId)
    if (!t) return
    if (campaign.gold < t.shopPrice) {
      onInsufficientGold()
      return
    }
    onBuy(templateId)
  }

  function toggleQuickSell() {
    setQuickSellMode((v) => {
      if (v) setSelectedIds(new Set())
      return !v
    })
  }

  function toggleSelected(itemId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  function sellSelected() {
    for (const id of selectedIds) onSell(id)
    setSelectedIds(new Set())
  }

  const shopGrid = (
    <InventoryGrid
      itemCount={SHOP_TEMPLATE_IDS.length}
      renderCell={(index, isEmpty) => {
        if (isEmpty) return <InventoryCell state="empty" ariaLabel="Пусто" />
        const tid = SHOP_TEMPLATE_IDS[index]!
        const t = getItemTemplate(tid)!
        return (
          <ShopTemplateCell
            key={tid}
            templateId={tid}
            inBattle={inBattle}
            canBuy={campaign.gold >= t.shopPrice}
            onDoubleClick={() => tryBuy(tid)}
            onBuy={() => tryBuy(tid)}
          />
        )
      }}
    />
  )

  const stashPreview = (
    <div>
      <Space wrap style={{ marginBottom: 8 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          В инвентаре (не экипировано)
        </Typography.Text>
        <Button
          size="small"
          type={quickSellMode ? 'primary' : 'default'}
          disabled={inBattle || stash.length === 0}
          onClick={toggleQuickSell}
        >
          Быстрая продажа
        </Button>
      </Space>
      <InventoryGrid
        itemCount={stash.length}
        renderCell={(index, isEmpty) => {
          if (isEmpty) return <InventoryCell state="empty" ariaLabel="Пустой слот" />
          const item = stash[index]!
          return (
            <StashPreviewCell
              key={item.id}
              item={item}
              inBattle={inBattle}
              onSell={() => onSell(item.id)}
              quickSellMode={quickSellMode}
              selected={selectedIds.has(item.id)}
              onCellClick={() => toggleSelected(item.id)}
            />
          )
        }}
      />
      {quickSellMode && selectedIds.size > 0 ? (
        <Space style={{ marginTop: 8 }}>
          <Typography.Text style={{ fontSize: 12 }}>
            Выбрано: {selectedIds.size} · {totalSellPriceForIds(selectedIds, stash)} 💰
          </Typography.Text>
          <Button size="small" type="primary" danger onClick={sellSelected}>
            Продать выбранное
          </Button>
        </Space>
      ) : null}
    </div>
  )

  const body = (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
        Двойной клик по товару — покупка. Продажа — через popover или «Быстрая продажа» ниже.
      </Typography.Paragraph>
      {shopGrid}
      {stashPreview}
    </Space>
  )

  if (inBattle) {
    return <Tooltip title="Доступно после боя">{body}</Tooltip>
  }

  return body
}
