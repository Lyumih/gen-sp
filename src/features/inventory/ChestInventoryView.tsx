import type { ReactNode } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Space, Typography } from 'antd'
import { getCardAttackTemplate } from '../../game/content/cardTemplates'
import { getPassiveTemplate } from '../../game/content/passiveTemplates'
import { STARTER_HERO_BASE_STATS } from '../../game/config/baseStats'
import { sellPriceForPassive, sellPriceForSkill } from '../../game/config/skillAcquisition'
import { getCardDisplayLabel } from '../../game/descriptions/cardText'
import {
  describePassiveStats,
  getPassiveDisplayLabel,
} from '../../game/descriptions/passiveText'
import {
  itemInstanceDescriptionLinesFromInstance,
  itemPriceLine,
  itemSellPrice,
} from '../../game/descriptions/itemText'
import { getCharacter } from '../../game/character/selectors'
import { getItemTemplate } from '../../game/content/itemTemplates'
import type { CampaignState, Character, ItemInstance, PassiveInstance } from '../../game/types'
import { UI_LEVEL } from '../../game/ui/labels'
import {
  chestDropDragId,
  chestItemDragId,
  parseDragId,
} from './inventoryDnD'
import { ItemPopoverActions } from './ItemPopoverActions'
import { InventoryCell } from './InventoryCell'
import { InventoryGrid } from './InventoryGrid'
import { resolveCardEmoji, resolveItemEmoji, resolvePassiveEmoji } from './inventoryEmoji'

type ChestInventoryViewProps = {
  campaign: CampaignState
  inBattle: boolean
  inventoryLocked?: boolean
  bindCharacterId?: string
  onSellChestItem: (itemId: string) => void
  onSellChestCard?: (cardId: string) => void
  onSellChestPassive?: (passiveId: string) => void
  onBindCard?: (cardId: string) => void
  onBindPassive?: (passiveId: string) => void
  bindCharacterName?: string
  onAssignItemToCharacter?: (itemId: string) => void
  dndEnabled?: boolean
  activeDragId?: string | null
}

function DraggableChestItemCell({
  item,
  locked,
  dndEnabled,
  sellPrice,
  lines,
  tmpl,
  onSellChestItem,
  onAssignItemToCharacter,
}: {
  item: ItemInstance
  locked: boolean
  dndEnabled: boolean
  sellPrice: number
  lines: string[]
  tmpl: ReturnType<typeof getItemTemplate>
  onSellChestItem: (itemId: string) => void
  onAssignItemToCharacter?: (itemId: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: chestItemDragId(item.id),
    disabled: locked || !dndEnabled,
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
      {...(dndEnabled && !locked ? { ...attributes, ...listeners } : {})}
      style={{ opacity: isDragging ? 0.4 : undefined, cursor: dndEnabled ? 'grab' : undefined }}
      emoji={resolveItemEmoji(tmpl, tmpl?.slot ?? 'weapon')}
      levelBadge={`${UI_LEVEL}${item.itemLevel}`}
      contextBadge={sellPrice > 0 ? `${sellPrice} 💰` : undefined}
      state={locked ? 'disabled' : 'filled'}
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
          <ItemPopoverActions inBattle={locked} actions={popoverActions} />
        </Space>
      }
      ariaLabel={tmpl?.label ?? item.templateId}
    />
  )
}

function ChestDropZone({
  children,
  locked,
  activeDragId,
}: {
  children: ReactNode
  locked: boolean
  activeDragId?: string | null
}) {
  const activeParsed = activeDragId ? parseDragId(activeDragId) : null
  const stashDrag = activeParsed?.kind === 'stash'
  const { setNodeRef, isOver } = useDroppable({
    id: chestDropDragId(),
    disabled: locked || !stashDrag,
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
  inventoryLocked = false,
  bindCharacterId,
  onSellChestItem,
  onSellChestCard,
  onSellChestPassive,
  onBindCard,
  onBindPassive,
  bindCharacterName,
  onAssignItemToCharacter,
  dndEnabled = false,
  activeDragId = null,
}: ChestInventoryViewProps) {
  const locked = inBattle || inventoryLocked
  const { items, unboundCards, unboundPassives } = campaign.chest
  const total = items.length + unboundCards.length + unboundPassives.length
  const bindHero =
    bindCharacterId !== undefined ? getCharacter(campaign, bindCharacterId) : undefined
  const canBindPassive =
    bindHero !== undefined && bindHero.passives.length < 4
  const previewCharacter = bindHero ?? {
    baseStats: STARTER_HERO_BASE_STATS,
    unitLevel: 1,
    items: [],
    equipment: { weapon: null, armor: null, accessory: null },
  }

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
              locked={locked}
              dndEnabled={dndEnabled}
              sellPrice={sellPrice}
              lines={lines}
              tmpl={tmpl}
              onSellChestItem={onSellChestItem}
              onAssignItemToCharacter={onAssignItemToCharacter}
            />
          )
        }
        const cardIndex = index - items.length
        if (cardIndex < unboundCards.length) {
          const card = unboundCards[cardIndex]!
          const tmpl = getCardAttackTemplate(card.templateId)
          const label = getCardDisplayLabel(card.templateId)
          const skillSellPrice = sellPriceForSkill()
          const canSellCard = Boolean(onSellChestCard) && card.templateId !== 'strike'
          return (
            <InventoryCell
              key={card.id}
              emoji={resolveCardEmoji(tmpl)}
              contextBadge={
                canSellCard && skillSellPrice > 0 ? `${skillSellPrice} 💰` : '🃏'
              }
              levelBadge={`${UI_LEVEL}${card.global_level}`}
              state={locked ? 'disabled' : 'filled'}
              popoverTitle={label}
              popoverContent={
                <Space orientation="vertical" size="small">
                  <Typography.Text style={{ fontSize: 12 }}>
                    Умение уровня {card.global_level}. Привязка к персонажу необратима.
                  </Typography.Text>
                  {canSellCard && skillSellPrice > 0 ? (
                    <Typography.Text style={{ fontSize: 12 }}>
                      {itemPriceLine(skillSellPrice)}
                    </Typography.Text>
                  ) : null}
                  <ItemPopoverActions
                    inBattle={locked}
                    actions={[
                      ...(onBindCard && bindCharacterName
                        ? [
                            {
                              key: 'bind',
                              label: `Назначить: ${bindCharacterName}`,
                              type: 'primary' as const,
                              onClick: () => onBindCard(card.id),
                            },
                          ]
                        : []),
                      ...(canSellCard
                        ? [
                            {
                              key: 'sell',
                              label: 'Продать',
                              danger: true,
                              disabled: skillSellPrice <= 0,
                              onClick: () => onSellChestCard!(card.id),
                            },
                          ]
                        : []),
                    ]}
                  />
                </Space>
              }
              ariaLabel={label}
            />
          )
        }
        const passive = unboundPassives[index - items.length - unboundCards.length]!
        return (
          <ChestPassiveCell
            key={passive.id}
            passive={passive}
            previewCharacter={previewCharacter}
            locked={locked}
            sellPrice={sellPriceForPassive()}
            canBind={canBindPassive}
            bindCharacterName={bindCharacterName}
            onBindPassive={onBindPassive}
            onSellChestPassive={onSellChestPassive}
          />
        )
      }}
    />
  )

  return (
    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Общий сундук — предметы, непривязанные умения и навыки
        {dndEnabled ? ' · перетащите предмет на персонажа или из инвентаря в сундук' : null}
      </Typography.Text>
      {dndEnabled ? (
        <ChestDropZone locked={locked} activeDragId={activeDragId}>
          {grid}
        </ChestDropZone>
      ) : (
        grid
      )}
    </Space>
  )
}

function ChestPassiveCell({
  passive,
  previewCharacter,
  locked,
  sellPrice,
  canBind,
  bindCharacterName,
  onBindPassive,
  onSellChestPassive,
}: {
  passive: PassiveInstance
  previewCharacter: Pick<Character, 'baseStats' | 'unitLevel' | 'items' | 'equipment'>
  locked: boolean
  sellPrice: number
  canBind: boolean
  bindCharacterName?: string
  onBindPassive?: (passiveId: string) => void
  onSellChestPassive?: (passiveId: string) => void
}) {
  const tmpl = getPassiveTemplate(passive.templateId)
  const label = getPassiveDisplayLabel(passive.templateId)
  const stats = describePassiveStats(passive, previewCharacter, { worldPower: 0 })
  const canSell = Boolean(onSellChestPassive)

  return (
    <InventoryCell
      emoji={resolvePassiveEmoji(tmpl)}
      contextBadge={canSell && sellPrice > 0 ? `${sellPrice} 💰` : '✨'}
      levelBadge={`${UI_LEVEL}${passive.global_level}`}
      state={locked ? 'disabled' : 'filled'}
      popoverTitle={label}
      popoverContent={
        <Space orientation="vertical" size="small">
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {stats.lines.map((line, i) => (
              <li key={i}>
                <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
              </li>
            ))}
          </ul>
          <Typography.Text style={{ fontSize: 12 }}>
            Привязка к персонажу необратима (макс. 4 навыка).
          </Typography.Text>
          {canSell && sellPrice > 0 ? (
            <Typography.Text style={{ fontSize: 12 }}>{itemPriceLine(sellPrice)}</Typography.Text>
          ) : null}
          <ItemPopoverActions
            inBattle={locked}
            actions={[
              ...(onBindPassive && bindCharacterName
                ? [
                    {
                      key: 'bind',
                      label: `Назначить: ${bindCharacterName}`,
                      type: 'primary' as const,
                      disabled: !canBind,
                      onClick: () => onBindPassive(passive.id),
                    },
                  ]
                : []),
              ...(canSell
                ? [
                    {
                      key: 'sell',
                      label: 'Продать',
                      danger: true,
                      disabled: sellPrice <= 0,
                      onClick: () => onSellChestPassive!(passive.id),
                    },
                  ]
                : []),
            ]}
          />
        </Space>
      }
      ariaLabel={label}
    />
  )
}
