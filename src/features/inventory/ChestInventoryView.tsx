import type { ReactNode } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Space, Typography } from 'antd'
import { getCardAttackTemplate } from '../../game/content/cardTemplates'
import { getCardDisplayLabel } from '../../game/descriptions/cardText'
import {
  itemInstanceDescriptionLinesFromInstance,
  itemPriceLine,
  itemSellPrice,
} from '../../game/descriptions/itemText'
import { getItemTemplate } from '../../game/content/itemTemplates'
import type { CampaignState, ItemInstance } from '../../game/types'
import { UI_LEVEL } from '../../game/ui/labels'
import { chestDropDragId, chestItemDragId, parseDragId } from './inventoryDnD'
import { ItemPopoverActions } from './ItemPopoverActions'
import { InventoryCell } from './InventoryCell'
import { InventoryGrid } from './InventoryGrid'
import { resolveCardEmoji, resolveItemEmoji } from './inventoryEmoji'

type ChestInventoryViewProps = {
  campaign: CampaignState
  inBattle: boolean
  onSellChestItem: (itemId: string) => void
  onBindCard?: (cardId: string) => void
  bindCharacterName?: string
  onAssignItemToCharacter?: (itemId: string) => void
  dndEnabled?: boolean
  activeDragId?: string | null
}

function DraggableChestItemCell({
  item,
  inBattle,
  dndEnabled,
  sellPrice,
  lines,
  tmpl,
  onSellChestItem,
  onAssignItemToCharacter,
}: {
  item: ItemInstance
  inBattle: boolean
  dndEnabled: boolean
  sellPrice: number
  lines: string[]
  tmpl: ReturnType<typeof getItemTemplate>
  onSellChestItem: (itemId: string) => void
  onAssignItemToCharacter?: (itemId: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: chestItemDragId(item.id),
    disabled: inBattle || !dndEnabled,
  })

  const popoverActions = [
    ...(onAssignItemToCharacter
      ? [
          {
            key: 'assign',
            label: 'Передать персонажу',
            type: 'primary' as const,
            onClick: () => onAssignItemToCharacter(item.id),
          },
        ]
      : []),
    {
      key: 'sell',
      label: 'Продать',
      danger: true,
      disabled: sellPrice <= 0,
      onClick: () => onSellChestItem(item.id),
    },
  ]

  return (
    <InventoryCell
      ref={setNodeRef}
      {...(dndEnabled && !inBattle ? { ...attributes, ...listeners } : {})}
      style={{ opacity: isDragging ? 0.4 : undefined, cursor: dndEnabled ? 'grab' : undefined }}
      emoji={resolveItemEmoji(tmpl, tmpl?.slot ?? 'weapon')}
      levelBadge={`${UI_LEVEL}${item.itemLevel}`}
      contextBadge={sellPrice > 0 ? `${sellPrice} 💰` : undefined}
      state={inBattle ? 'disabled' : 'filled'}
      popoverTitle={tmpl?.label}
      popoverContent={
        <Space orientation="vertical" size="small">
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {lines.map((line, i) => (
              <li key={i}>
                <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
              </li>
            ))}
          </ul>
          {sellPrice > 0 ? (
            <Typography.Text style={{ fontSize: 12 }}>{itemPriceLine(sellPrice)}</Typography.Text>
          ) : null}
          <ItemPopoverActions inBattle={inBattle} actions={popoverActions} />
        </Space>
      }
      ariaLabel={tmpl?.label ?? item.templateId}
    />
  )
}

function ChestDropZone({
  children,
  inBattle,
  activeDragId,
}: {
  children: ReactNode
  inBattle: boolean
  activeDragId?: string | null
}) {
  const activeParsed = activeDragId ? parseDragId(activeDragId) : null
  const stashDrag = activeParsed?.kind === 'stash'
  const { setNodeRef, isOver } = useDroppable({
    id: chestDropDragId(),
    disabled: inBattle || !stashDrag,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        outline: isOver && stashDrag ? '2px dashed #52c41a' : undefined,
        borderRadius: 6,
        padding: isOver && stashDrag ? 2 : 0,
      }}
    >
      {children}
    </div>
  )
}

export function ChestInventoryView({
  campaign,
  inBattle,
  onSellChestItem,
  onBindCard,
  bindCharacterName,
  onAssignItemToCharacter,
  dndEnabled = false,
  activeDragId = null,
}: ChestInventoryViewProps) {
  const { items, unboundCards } = campaign.chest
  const total = items.length + unboundCards.length

  const grid = (
    <InventoryGrid
      itemCount={total}
      renderCell={(index, isEmpty) => {
        if (isEmpty) return <InventoryCell state="empty" ariaLabel="Пустой слот сундука" />
        if (index < items.length) {
          const item = items[index]!
          const tmpl = getItemTemplate(item.templateId)
          const sellPrice = tmpl ? itemSellPrice(tmpl) : 0
          const lines = itemInstanceDescriptionLinesFromInstance(item, getItemTemplate)
          return (
            <DraggableChestItemCell
              key={item.id}
              item={item}
              inBattle={inBattle}
              dndEnabled={dndEnabled}
              sellPrice={sellPrice}
              lines={lines}
              tmpl={tmpl}
              onSellChestItem={onSellChestItem}
              onAssignItemToCharacter={onAssignItemToCharacter}
            />
          )
        }
        const card = unboundCards[index - items.length]!
        const tmpl = getCardAttackTemplate(card.templateId)
        const label = getCardDisplayLabel(card.templateId)
        return (
          <InventoryCell
            key={card.id}
            emoji={resolveCardEmoji(tmpl)}
            contextBadge="🃏"
            levelBadge={`${UI_LEVEL}${card.global_level}`}
            state={inBattle ? 'disabled' : 'filled'}
            popoverTitle={label}
            popoverContent={
              <Space orientation="vertical" size="small">
                <Typography.Text style={{ fontSize: 12 }}>
                  Умение уровня {card.global_level}. Привязка к персонажу необратима.
                </Typography.Text>
                {onBindCard && bindCharacterName ? (
                  <ItemPopoverActions
                    inBattle={inBattle}
                    actions={[
                      {
                        key: 'bind',
                        label: `Назначить: ${bindCharacterName}`,
                        type: 'primary',
                        onClick: () => onBindCard(card.id),
                      },
                    ]}
                  />
                ) : null}
              </Space>
            }
            ariaLabel={label}
          />
        )
      }}
    />
  )

  return (
    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Общий сундук — предметы и непривязанные умения
        {dndEnabled ? ' · перетащите предмет на персонажа или из инвентаря в сундук' : null}
      </Typography.Text>
      {dndEnabled ? (
        <ChestDropZone inBattle={inBattle} activeDragId={activeDragId}>
          {grid}
        </ChestDropZone>
      ) : (
        grid
      )}
    </Space>
  )
}
