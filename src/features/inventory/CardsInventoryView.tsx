import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
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
import { getCharacter } from '../../game/character/selectors'
import { describeCardCombatStats, getCardDisplayLabel } from '../../game/descriptions/cardText'
import type { CampaignState, CardInstance } from '../../game/types'
import { UI_DAMAGE, UI_HEART, UI_LEVEL } from '../../game/ui/labels'
import { InventoryCell, type InventoryCellState } from './InventoryCell'
import { InventoryGrid } from './InventoryGrid'
import { cardDragId, loadoutDragId, parseDragId } from './inventoryDnD'
import { resolveCardEmoji } from './inventoryEmoji'
import './inventory.css'

type CardsInventoryViewProps = {
  campaign: CampaignState
  characterId: string
  inBattle: boolean
  gearCardLevelBonus: number
  onReorderCards: (cardIds: string[]) => void
  onSetModKillTarget: (cardId: string) => void
  onSetBattleLoadout: (slotIndex: 0 | 1, cardId: string | null) => void
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

  const effectUi = tmpl?.kind === 'heal' ? UI_HEART : UI_DAMAGE

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
        stats.expectedDamage !== null ? `${effectUi}${stats.expectedDamage}` : undefined
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

function LoadoutSlotCell({
  slotIndex,
  card,
  inBattle,
  gearCardLevelBonus,
  isTarget,
  onSelect,
}: {
  slotIndex: 0 | 1
  card: CardInstance | null
  inBattle: boolean
  gearCardLevelBonus: number
  isTarget: boolean
  onSelect: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: loadoutDragId(slotIndex),
    disabled: inBattle,
  })

  if (card) {
    return (
      <div ref={setNodeRef} style={{ outline: isOver ? '2px solid #52c41a' : undefined }}>
        <SortableCardCell
          card={card}
          inBattle={inBattle}
          isTarget={isTarget}
          gearCardLevelBonus={gearCardLevelBonus}
          onSelect={onSelect}
        />
      </div>
    )
  }

  return (
    <div ref={setNodeRef}>
      <InventoryCell
        state={isOver ? 'dragOver' : 'empty'}
        ariaLabel={`Слот в бою ${slotIndex + 1}`}
        emoji="⚔️"
      />
    </div>
  )
}

export function CardsInventoryView({
  campaign,
  characterId,
  inBattle,
  gearCardLevelBonus,
  onReorderCards,
  onSetModKillTarget,
  onSetBattleLoadout,
}: CardsInventoryViewProps) {
  const hero = getCharacter(campaign, characterId)
  const loadout = hero?.battleLoadout ?? [null, null]
  const loadoutIds = new Set(loadout.filter((id): id is string => id !== null))
  const collectionCards = hero?.cards.filter((c) => !loadoutIds.has(c.id)) ?? []
  const cardIds = collectionCards.map((c) => c.id)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const targetCard = hero?.cards.find((c) => c.id === campaign.modKillTargetCardId)

  function resolveCard(cardId: string): CardInstance | undefined {
    return hero?.cards.find((c) => c.id === cardId)
  }

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
    if (!active || active.kind !== 'card') return

    if (over?.kind === 'loadout') {
      const slotIndex = Number(over.value)
      if (slotIndex === 0 || slotIndex === 1) {
        onSetBattleLoadout(slotIndex, active.value)
      }
      return
    }

    const fromLoadoutSlot = loadout.indexOf(active.value)
    if (fromLoadoutSlot >= 0 && over?.kind !== 'loadout') {
      onSetBattleLoadout(fromLoadoutSlot as 0 | 1, null)
      return
    }

    if (over?.kind === 'card') {
      const oldIndex = cardIds.indexOf(active.value)
      const newIndex = cardIds.indexOf(over.value)
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        onReorderCards(arrayMove(cardIds, oldIndex, newIndex))
      }
    }
  }

  function renderLoadoutSlot(slotIndex: 0 | 1) {
    const cardId = loadout[slotIndex]
    const card = cardId !== null ? resolveCard(cardId) : null
    return (
      <LoadoutSlotCell
        key={slotIndex}
        slotIndex={slotIndex}
        card={card ?? null}
        inBattle={inBattle}
        gearCardLevelBonus={gearCardLevelBonus}
        isTarget={cardId !== null && cardId === campaign.modKillTargetCardId}
        onSelect={() => {
          if (cardId !== null && !inBattle) onSetModKillTarget(cardId)
        }}
      />
    )
  }

  const content = (
    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        В бой (2 слота) — перетащите карту из коллекции
      </Typography.Text>
      <div className="inventory-loadout-row" style={{ display: 'flex', gap: 4 }}>
        {renderLoadoutSlot(0)}
        {renderLoadoutSlot(1)}
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {targetCard
          ? `Моды за kill → ${getCardDisplayLabel(targetCard.templateId)} 🎯`
          : 'Выберите карту для модов за kill'}
      </Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Коллекция
      </Typography.Text>
      <SortableContext items={cardIds.map(cardDragId)} strategy={rectSortingStrategy}>
        <InventoryGrid
          itemCount={collectionCards.length}
          renderCell={(index, isEmpty) => {
            if (isEmpty) {
              return <InventoryCell state="empty" ariaLabel="Пустой слот карт" />
            }
            const card = collectionCards[index]!
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

  if (!hero) return null

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
              getCardAttackTemplate(resolveCard(activeCardId)?.templateId ?? ''),
            )}
            state="filled"
            ariaLabel="Перетаскивание карты"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
