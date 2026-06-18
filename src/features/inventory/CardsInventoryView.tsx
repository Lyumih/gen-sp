import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Space, Tooltip, Typography } from 'antd'
import { getCardAttackTemplate } from '../../game/content/cardTemplates'
import { describeCardCombatStats, getCardDisplayLabel } from '../../game/descriptions/cardText'
import type { CampaignState, CardInstance } from '../../game/types'
import { UI_DAMAGE, UI_LEVEL } from '../../game/ui/labels'
import { InventoryCell, type InventoryCellState } from './InventoryCell'
import { InventoryGrid } from './InventoryGrid'
import { cardDragId, parseDragId } from './inventoryDnD'
import { resolveCardEmoji } from './inventoryEmoji'
import './inventory.css'

type CardsInventoryViewProps = {
  campaign: CampaignState
  inBattle: boolean
  gearCardLevelBonus: number
  onReorderCards: (cardIds: string[]) => void
  onSetModKillTarget: (cardId: string) => void
}

function SortableCardCell({
  card,
  inBattle,
  isTarget,
  gearCardLevelBonus,
  onSelect,
}: {
  card: CardInstance
  inBattle: boolean
  isTarget: boolean
  gearCardLevelBonus: number
  onSelect: () => void
}) {
  const tmpl = getCardAttackTemplate(card.templateId)
  const stats = describeCardCombatStats(card, gearCardLevelBonus)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cardDragId(card.id),
    disabled: inBattle,
  })

  const state: InventoryCellState = inBattle
    ? 'disabled'
    : isTarget
      ? 'modKillTarget'
      : 'filled'

  const popover = (
    <ul style={{ margin: 0, paddingLeft: 16, maxWidth: 320 }}>
      {stats.lines.map((line, idx) => (
        <li key={idx}>
          <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
        </li>
      ))}
    </ul>
  )

  return (
    <InventoryCell
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : undefined,
      }}
      {...attributes}
      {...listeners}
      emoji={resolveCardEmoji(tmpl)}
      levelBadge={`${UI_LEVEL}${card.global_level}`}
      contextBadge={
        stats.expectedDamage !== null ? `${UI_DAMAGE}${stats.expectedDamage}` : undefined
      }
      state={state}
      showTargetBadge={isTarget}
      popoverTitle={stats.displayLabel}
      popoverContent={popover}
      ariaLabel={`${stats.displayLabel}, ${UI_LEVEL}${card.global_level}`}
      onDoubleClick={onSelect}
      onClick={onSelect}
    />
  )
}

export function CardsInventoryView({
  campaign,
  inBattle,
  gearCardLevelBonus,
  onReorderCards,
  onSetModKillTarget,
}: CardsInventoryViewProps) {
  const cards = campaign.cards
  const cardIds = cards.map((c) => c.id)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const targetCard = cards.find((c) => c.id === campaign.modKillTargetCardId)

  function handleDragStart(event: DragStartEvent) {
    if (inBattle) return
    const parsed = parseDragId(String(event.active.id))
    if (parsed?.kind === 'card') setActiveCardId(parsed.value)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCardId(null)
    if (inBattle) return
    const active = parseDragId(String(event.active.id))
    const over = event.over ? parseDragId(String(event.over.id)) : null
    if (active?.kind === 'card' && over?.kind === 'card') {
      const oldIndex = cardIds.indexOf(active.value)
      const newIndex = cardIds.indexOf(over.value)
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        onReorderCards(arrayMove(cardIds, oldIndex, newIndex))
      }
    }
  }

  const content = (
    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {targetCard
          ? `Моды за kill → ${getCardDisplayLabel(targetCard.templateId)} 🎯`
          : 'Выберите карту для модов за kill'}
      </Typography.Text>
      <SortableContext items={cardIds.map(cardDragId)} strategy={rectSortingStrategy}>
        <InventoryGrid
          itemCount={cards.length}
          renderCell={(index, isEmpty) => {
            if (isEmpty) {
              return <InventoryCell state="empty" ariaLabel="Пустой слот карт" />
            }
            const card = cards[index]!
            return (
              <SortableCardCell
                key={card.id}
                card={card}
                inBattle={inBattle}
                isTarget={card.id === campaign.modKillTargetCardId}
                gearCardLevelBonus={gearCardLevelBonus}
                onSelect={() => {
                  if (!inBattle) onSetModKillTarget(card.id)
                }}
              />
            )
          }}
        />
      </SortableContext>
    </Space>
  )

  if (inBattle) {
    return <Tooltip title="Доступно после боя">{content}</Tooltip>
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {content}
      <DragOverlay>
        {activeCardId ? (
          <InventoryCell
            emoji={resolveCardEmoji(
              getCardAttackTemplate(cards.find((c) => c.id === activeCardId)?.templateId ?? ''),
            )}
            state="filled"
            ariaLabel="Перетаскивание карты"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
