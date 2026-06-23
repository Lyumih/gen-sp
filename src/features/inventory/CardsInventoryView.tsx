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
import { App, Divider, Space, Tooltip, Typography } from 'antd'
import { getCardAttackTemplate } from '../../game/content/cardTemplates'
import { getCharacter } from '../../game/character/selectors'
import { describeCardCombatStats } from '../../game/descriptions/cardText'
import type { CampaignState, CardInstance, ModOffer } from '../../game/types'
import { UI_DAMAGE, UI_HEART, UI_LEVEL } from '../../game/ui/labels'
import { InventoryCell } from './InventoryCell'
import { InventoryGrid } from './InventoryGrid'
import { ModOfferPicker } from './ModOfferPicker'
import { cardDragId, loadoutDragId, parseDragId } from './inventoryDnD'
import { resolveCardEmoji } from './inventoryEmoji'
import {
  CarrierModPopoverSection,
  ModSlotDots,
  hasPendingModOffer,
  removeModConfirmText,
} from './modSlotBadges'
import './inventory.css'

type ModCarrierKind = 'card' | 'item'

type PickerState = {
  carrierKind: ModCarrierKind
  carrierId: string
  slotIndex: number
  offer: ModOffer
} | null

type CardsInventoryViewProps = {
  campaign: CampaignState
  characterId: string
  inBattle: boolean
  modsDisabled?: boolean
  modsDisabledTooltip?: string
  gearCardLevelBonus: number
  onReorderCards: (cardIds: string[]) => void
  onSetBattleLoadout: (slotIndex: 0 | 1, cardId: string | null) => void
  onPickModOffer: (
    carrierKind: 'card',
    carrierId: string,
    slotIndex: number,
    modTemplateId: string,
  ) => void
  onRemoveMod: (carrierKind: 'card', carrierId: string, slotIndex: number) => void
}

function SortableCardCell({
  card,
  inBattle,
  modsDisabled,
  gearCardLevelBonus,
  onOpenPicker,
  onConfirmRemove,
  modsDisabledTooltip,
}: {
  card: CardInstance
  inBattle: boolean
  modsDisabled: boolean
  modsDisabledTooltip?: string
  gearCardLevelBonus: number
  onOpenPicker: (carrierId: string, slotIndex: number, offer: ModOffer) => void
  onConfirmRemove: (card: CardInstance, slotIndex: number) => void
}) {
  const tmpl = getCardAttackTemplate(card.templateId)
  const loadoutBlocked = tmpl?.enabled === false
  const stats = describeCardCombatStats(card, gearCardLevelBonus)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cardDragId(card.id),
    disabled: inBattle || loadoutBlocked,
  })

  const effectUi = tmpl?.kind === 'heal' ? UI_HEART : UI_DAMAGE
  const showModBadge = !modsDisabled && hasPendingModOffer(card.modSlots)
  const hasModUi = card.modSlots.length > 0 || card.global_level > 0

  const popover = (
    <Space orientation="vertical" size="small" style={{ maxWidth: 320 }}>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {stats.lines.map((line, idx) => (
          <li key={idx}>
            <Typography.Text style={{ fontSize: 12 }}>{line}</Typography.Text>
          </li>
        ))}
      </ul>
      {hasModUi ? (
        <>
          <Divider style={{ margin: '4px 0' }} />
          <CarrierModPopoverSection
            modSlots={card.modSlots}
            carrierLevel={card.global_level}
            modsDisabled={modsDisabled}
            modsDisabledTooltip={modsDisabledTooltip}
            onOpenPicker={(slotIndex, offer) => onOpenPicker(card.id, slotIndex, offer)}
            onConfirmRemove={(slotIndex) => onConfirmRemove(card, slotIndex)}
          />
        </>
      ) : null}
    </Space>
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
      showModPendingBadge={showModBadge}
      slotDots={card.modSlots.length > 0 ? <ModSlotDots modSlots={card.modSlots} /> : undefined}
      state={inBattle || loadoutBlocked ? 'disabled' : 'filled'}
      popoverTitle={stats.displayLabel}
      popoverContent={
        <Space orientation="vertical" size="small" style={{ maxWidth: 320 }}>
          {loadoutBlocked ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Умение отключено — нельзя взять в бой.
            </Typography.Text>
          ) : null}
          {popover}
        </Space>
      }
      ariaLabel={`${stats.displayLabel}, ${UI_LEVEL}${card.global_level}`}
    />
  )
}

function LoadoutSlotCell({
  slotIndex,
  card,
  inBattle,
  modsDisabled,
  gearCardLevelBonus,
  onOpenPicker,
  onConfirmRemove,
  modsDisabledTooltip,
}: {
  slotIndex: 0 | 1
  card: CardInstance | null
  inBattle: boolean
  modsDisabled: boolean
  modsDisabledTooltip?: string
  gearCardLevelBonus: number
  onOpenPicker: (carrierId: string, slotIndex: number, offer: ModOffer) => void
  onConfirmRemove: (card: CardInstance, slotIndex: number) => void
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
          modsDisabled={modsDisabled}
          modsDisabledTooltip={modsDisabledTooltip}
          gearCardLevelBonus={gearCardLevelBonus}
          onOpenPicker={onOpenPicker}
          onConfirmRemove={onConfirmRemove}
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
  modsDisabled = false,
  modsDisabledTooltip,
  gearCardLevelBonus,
  onReorderCards,
  onSetBattleLoadout,
  onPickModOffer,
  onRemoveMod,
}: CardsInventoryViewProps) {
  const { modal } = App.useApp()
  const hero = getCharacter(campaign, characterId)
  const loadout = hero?.battleLoadout ?? [null, null]
  const loadoutIds = new Set(loadout.filter((id): id is string => id !== null))
  const collectionCards = hero?.cards.filter((c) => !loadoutIds.has(c.id)) ?? []
  const cardIds = collectionCards.map((c) => c.id)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [picker, setPicker] = useState<PickerState>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  function resolveCard(cardId: string): CardInstance | undefined {
    return hero?.cards.find((c) => c.id === cardId)
  }

  function openPicker(carrierId: string, slotIndex: number, offer: ModOffer) {
    setPicker({ carrierKind: 'card', carrierId, slotIndex, offer })
  }

  function confirmRemoveMod(card: CardInstance, slotIndex: number) {
    modal.confirm({
      title: 'Удалить модификатор?',
      content: removeModConfirmText(card.global_level, slotIndex),
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: () => onRemoveMod('card', card.id, slotIndex),
    })
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
      const card = resolveCard(active.value)
      const tmpl = card ? getCardAttackTemplate(card.templateId) : undefined
      if (tmpl?.enabled === false) return
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
        modsDisabled={modsDisabled}
        modsDisabledTooltip={modsDisabledTooltip}
        gearCardLevelBonus={gearCardLevelBonus}
        onOpenPicker={openPicker}
        onConfirmRemove={confirmRemoveMod}
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
                modsDisabled={modsDisabled}
                modsDisabledTooltip={modsDisabledTooltip}
                gearCardLevelBonus={gearCardLevelBonus}
                onOpenPicker={openPicker}
                onConfirmRemove={confirmRemoveMod}
              />
            )
          }}
        />
      </SortableContext>
      <ModOfferPicker
        open={picker !== null}
        offer={picker?.offer ?? null}
        onCancel={() => setPicker(null)}
        onPick={(modTemplateId) => {
          if (!picker) return
          onPickModOffer('card', picker.carrierId, picker.slotIndex, modTemplateId)
          setPicker(null)
        }}
      />
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
