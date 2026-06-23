import { useState } from 'react'
import { Button, Space, Typography } from 'antd'
import { getItemTemplate } from '../../../game/content/itemTemplates'
import {
  itemInstanceDescriptionLinesFromInstance,
  itemPriceLine,
  itemSellPrice,
} from '../../../game/descriptions/itemText'
import type { ItemInstance } from '../../../game/types'
import { UI_LEVEL } from '../../../game/ui/labels'
import { SHOP_SELL_SECTION_HELP } from '../../campaign/sectionTooltips'
import { ItemPopoverActions } from '../../inventory/ItemPopoverActions'
import { InventoryCell } from '../../inventory/InventoryCell'
import { InventoryGrid } from '../../inventory/InventoryGrid'
import { resolveItemEmoji } from '../../inventory/inventoryEmoji'
import { SectionHelp } from '../../layout/SectionHelp'
import { totalSellPriceForIds } from './shopSellUtils'

type ShopSellPanelProps = {
  stash: readonly ItemInstance[]
  inBattle: boolean
  onSellItem: (itemId: string) => void
}

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

export function ShopSellPanel({ stash, inBattle, onSellItem }: ShopSellPanelProps) {
  const [quickSellMode, setQuickSellMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

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
    for (const id of selectedIds) onSellItem(id)
    setSelectedIds(new Set())
    setQuickSellMode(false)
  }

  return (
    <div>
      <Space wrap style={{ marginBottom: 8 }}>
        <Typography.Text strong>
          Продажа <SectionHelp content={SHOP_SELL_SECTION_HELP} />
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
          const tmpl = getItemTemplate(item.templateId)
          const sellPrice = tmpl ? itemSellPrice(tmpl) : 0
          const selected = selectedIds.has(item.id)
          return (
            <InventoryCell
              key={item.id}
              emoji={resolveItemEmoji(tmpl, tmpl?.slot ?? 'weapon')}
              levelBadge={`${UI_LEVEL}${item.itemLevel}`}
              contextBadge={sellPrice > 0 ? `${sellPrice} 💰` : undefined}
              state={inBattle ? 'disabled' : 'filled'}
              className={selected ? 'inv-cell--selected' : undefined}
              popoverTitle={tmpl?.label}
              popoverContent={shopStashItemPopover(item, inBattle, () => onSellItem(item.id))}
              ariaLabel={tmpl?.label ?? item.templateId}
              onClick={
                quickSellMode && !inBattle
                  ? (e) => {
                      e.stopPropagation()
                      toggleSelected(item.id)
                    }
                  : undefined
              }
            />
          )
        }}
      />
      {quickSellMode && selectedIds.size > 0 ? (
        <Space style={{ marginTop: 8 }}>
          <Typography.Text style={{ fontSize: 12 }}>
            Выбрано: {selectedIds.size} · {totalSellPriceForIds(selectedIds, stash)} 💰
          </Typography.Text>
          <Button size="small" type="primary" danger disabled={inBattle} onClick={sellSelected}>
            Продать выбранное
          </Button>
        </Space>
      ) : null}
    </div>
  )
}
