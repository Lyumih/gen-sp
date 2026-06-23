import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
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
import { getPassiveTemplate } from '../../game/content/passiveTemplates'
import { getCharacter } from '../../game/character/selectors'
import { describeCardCombatStats } from '../../game/descriptions/cardText'
import { describePassiveStats } from '../../game/descriptions/passiveText'
import { itemPriceLine } from '../../game/descriptions/itemText'
import { sellPriceForSkill } from '../../game/config/skillAcquisition'
import { canEquipPassive } from '../../game/passives/equippedPassives'
import {
  maxPassiveEquipSlots,
  maxSkillLoadoutSlots,
} from '../../game/specialization/loadoutCaps'
import { previewOfferForNextSlot } from '../../game/specialization/previewOffer'
import type { CampaignState, CardInstance, ModOffer, PassiveInstance } from '../../game/types'
import { UI_DAMAGE, UI_HEART, UI_LEVEL } from '../../game/ui/labels'
import { InventoryCell } from './InventoryCell'
import { InventoryGrid } from './InventoryGrid'
import { ItemPopoverActions } from './ItemPopoverActions'
import { ModOfferPicker } from './ModOfferPicker'
import { cardDragId, loadoutDragId, passiveDragId, passiveEquipDragId, parseDragId } from './inventoryDnD'
import { resolveCardEmoji, resolvePassiveEmoji } from './inventoryEmoji'
import {
  CarrierModPopoverSection,
  ModSlotDots,
  hasPendingModOffer,
  removeModConfirmText,
} from './modSlotBadges'
import './inventory.css'

type ModCarrierKind = 'card' | 'passive'

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
  inventoryLocked?: boolean
  modsDisabled?: boolean
  modsDisabledTooltip?: string
  onReorderCards: (cardIds: string[]) => void
  onSetBattleLoadout: (slotIndex: 0 | 1 | 2 | 3, cardId: string | null) => void
  onSetPassiveEquip: (slotIndex: 0 | 1 | 2 | 3 | 4, passiveId: string | null) => void
  onPickModOffer: (
    carrierKind: ModCarrierKind,
    carrierId: string,
    slotIndex: number,
    modTemplateId: string,
  ) => void
  onRemoveMod: (carrierKind: ModCarrierKind, carrierId: string, slotIndex: number) => void
  onSellCard?: (cardId: string) => void
}

function SortableCardCell({
  card,
  character,
  campaign,
  inBattle,
  modsDisabled,
  onOpenPicker,
  onConfirmRemove,
  modsDisabledTooltip,
  onSell,
  sellPrice,
}: {
  card: CardInstance
  character: NonNullable<ReturnType<typeof getCharacter>>
  campaign: CampaignState
  inBattle: boolean
  modsDisabled: boolean
  modsDisabledTooltip?: string
  onOpenPicker: (carrierId: string, slotIndex: number, offer: ModOffer) => void
  onConfirmRemove: (card: CardInstance, slotIndex: number) => void
  onSell?: () => void
  sellPrice?: number
}) {
  const tmpl = getCardAttackTemplate(card.templateId)
  const loadoutBlocked = tmpl?.enabled === false
  const stats = describeCardCombatStats(card, character, campaign)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cardDragId(card.id),
    disabled: inBattle || loadoutBlocked,
  })

  const effectUi = tmpl?.kind === 'heal' ? UI_HEART : UI_DAMAGE
  const nextSlotPreview = previewOfferForNextSlot(
    campaign,
    character.id,
    character,
    'card',
    card,
  )
  const showModBadge = !modsDisabled && hasPendingModOffer(card.modSlots)
  const hasModUi = card.modSlots.length > 0 || card.global_level > 0 || nextSlotPreview !== null

  const popover = (
    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
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
            carrierKind="card"
            nextSlotPreview={nextSlotPreview}
            modsDisabled={modsDisabled}
            modsDisabledTooltip={modsDisabledTooltip}
            onOpenPicker={(slotIndex, offer) => onOpenPicker(card.id, slotIndex, offer)}
            onConfirmRemove={(slotIndex) => onConfirmRemove(card, slotIndex)}
          />
        </>
      ) : null}
      {onSell ? (
        <>
          {sellPrice !== undefined && sellPrice > 0 ? (
            <Typography.Text style={{ fontSize: 12 }}>{itemPriceLine(sellPrice)}</Typography.Text>
          ) : null}
          <ItemPopoverActions
            inBattle={inBattle}
            actions={[
              {
                key: 'sell',
                label: 'Продать',
                danger: true,
                disabled: (sellPrice ?? 0) <= 0,
                onClick: onSell,
              },
            ]}
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
        sellPrice !== undefined && sellPrice > 0
          ? `${sellPrice} 💰`
          : stats.expectedDamage !== null
            ? `${effectUi}${stats.expectedDamage}`
            : undefined
      }
      showModPendingBadge={showModBadge}
      slotDots={card.modSlots.length > 0 ? <ModSlotDots modSlots={card.modSlots} /> : undefined}
      state={inBattle || loadoutBlocked ? 'disabled' : 'filled'}
      popoverTitle={stats.displayLabel}
      popoverContent={
        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
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
  character,
  campaign,
  inBattle,
  modsDisabled,
  onOpenPicker,
  onConfirmRemove,
  modsDisabledTooltip,
}: {
  slotIndex: 0 | 1 | 2 | 3
  card: CardInstance | null
  character: NonNullable<ReturnType<typeof getCharacter>>
  campaign: CampaignState
  inBattle: boolean
  modsDisabled: boolean
  modsDisabledTooltip?: string
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
          character={character}
          campaign={campaign}
          inBattle={inBattle}
          modsDisabled={modsDisabled}
          modsDisabledTooltip={modsDisabledTooltip}
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

function DraggablePassiveCell({
  passive,
  character,
  campaign,
  locked,
  modsDisabled,
  onOpenPicker,
  onConfirmRemove,
  modsDisabledTooltip,
}: {
  passive: PassiveInstance
  character: NonNullable<ReturnType<typeof getCharacter>>
  campaign: CampaignState
  locked: boolean
  modsDisabled: boolean
  modsDisabledTooltip?: string
  onOpenPicker: (carrierId: string, slotIndex: number, offer: ModOffer) => void
  onConfirmRemove: (passive: PassiveInstance, slotIndex: number) => void
}) {
  const tmpl = getPassiveTemplate(passive.templateId)
  const stats = describePassiveStats(passive, character, campaign)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: passiveDragId(passive.id),
    disabled: locked,
  })

  const nextSlotPreview = previewOfferForNextSlot(
    campaign,
    character.id,
    character,
    'passive',
    passive,
  )
  const showModBadge = !modsDisabled && hasPendingModOffer(passive.modSlots)
  const hasModUi = passive.modSlots.length > 0 || passive.global_level > 0 || nextSlotPreview !== null

  const popover = (
    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
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
            modSlots={passive.modSlots}
            carrierLevel={passive.global_level}
            carrierKind="passive"
            nextSlotPreview={nextSlotPreview}
            modsDisabled={modsDisabled}
            modsDisabledTooltip={modsDisabledTooltip}
            onOpenPicker={(slotIndex, offer) => onOpenPicker(passive.id, slotIndex, offer)}
            onConfirmRemove={(slotIndex) => onConfirmRemove(passive, slotIndex)}
          />
        </>
      ) : null}
    </Space>
  )

  return (
    <InventoryCell
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.4 : undefined, cursor: locked ? undefined : 'grab' }}
      {...attributes}
      {...listeners}
      emoji={resolvePassiveEmoji(tmpl)}
      levelBadge={`${UI_LEVEL}${passive.global_level}`}
      showModPendingBadge={showModBadge}
      slotDots={passive.modSlots.length > 0 ? <ModSlotDots modSlots={passive.modSlots} /> : undefined}
      state={locked ? 'disabled' : 'filled'}
      popoverTitle={stats.displayLabel}
      popoverContent={popover}
      ariaLabel={`${stats.displayLabel}, ${UI_LEVEL}${passive.global_level}`}
    />
  )
}

function PassiveEquipSlotCell({
  slotIndex,
  passive,
  character,
  campaign,
  locked,
  modsDisabled,
  onOpenPicker,
  onConfirmRemove,
  modsDisabledTooltip,
  dragReject,
}: {
  slotIndex: 0 | 1 | 2 | 3 | 4
  passive: PassiveInstance | null
  character: NonNullable<ReturnType<typeof getCharacter>>
  campaign: CampaignState
  locked: boolean
  modsDisabled: boolean
  modsDisabledTooltip?: string
  onOpenPicker: (carrierId: string, slotIndex: number, offer: ModOffer) => void
  onConfirmRemove: (passive: PassiveInstance, slotIndex: number) => void
  dragReject?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: passiveEquipDragId(slotIndex),
    disabled: locked,
  })

  if (passive) {
    return (
      <div
        ref={setNodeRef}
        style={{
          outline: isOver ? '2px solid #52c41a' : dragReject ? '2px solid #ff4d4f' : undefined,
        }}
      >
        <DraggablePassiveCell
          passive={passive}
          character={character}
          campaign={campaign}
          locked={locked}
          modsDisabled={modsDisabled}
          modsDisabledTooltip={modsDisabledTooltip}
          onOpenPicker={onOpenPicker}
          onConfirmRemove={onConfirmRemove}
        />
      </div>
    )
  }

  return (
    <div ref={setNodeRef}>
      <InventoryCell
        state={dragReject ? 'invalidDrop' : isOver ? 'dragOver' : 'empty'}
        ariaLabel={`Слот навыка ${slotIndex + 1}`}
        emoji="✨"
      />
    </div>
  )
}

export function CardsInventoryView({
  campaign,
  characterId,
  inBattle,
  inventoryLocked = false,
  modsDisabled = false,
  modsDisabledTooltip,
  onReorderCards,
  onSetBattleLoadout,
  onSetPassiveEquip,
  onPickModOffer,
  onRemoveMod,
  onSellCard,
}: CardsInventoryViewProps) {
  const { modal, message } = App.useApp()
  const locked = inBattle || inventoryLocked
  const hero = getCharacter(campaign, characterId)
  const loadout = hero?.battleLoadout ?? [null, null, null, null]
  const passiveEquip = hero?.passiveEquip ?? [null, null, null, null, null]
  const loadoutIds = new Set(loadout.filter((id): id is string => id !== null))
  const equippedPassiveIds = new Set(passiveEquip.filter((id): id is string => id !== null))
  const collectionCards = hero?.cards.filter((c) => !loadoutIds.has(c.id)) ?? []
  const collectionPassives = hero?.passives.filter((p) => !equippedPassiveIds.has(p.id)) ?? []
  const cardIds = collectionCards.map((c) => c.id)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [activePassiveId, setActivePassiveId] = useState<string | null>(null)
  const [dragRejectSlot, setDragRejectSlot] = useState<number | null>(null)
  const [picker, setPicker] = useState<PickerState>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  function resolveCard(cardId: string): CardInstance | undefined {
    return hero?.cards.find((c) => c.id === cardId)
  }

  function resolvePassive(passiveId: string): PassiveInstance | undefined {
    return hero?.passives.find((p) => p.id === passiveId)
  }

  function openCardPicker(carrierId: string, slotIndex: number, offer: ModOffer) {
    setPicker({ carrierKind: 'card', carrierId, slotIndex, offer })
  }

  function openPassivePicker(carrierId: string, slotIndex: number, offer: ModOffer) {
    setPicker({ carrierKind: 'passive', carrierId, slotIndex, offer })
  }

  function confirmRemoveCardMod(card: CardInstance, slotIndex: number) {
    modal.confirm({
      title: 'Удалить модификатор?',
      content: removeModConfirmText(card.global_level, slotIndex),
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: () => onRemoveMod('card', card.id, slotIndex),
    })
  }

  function confirmRemovePassiveMod(passive: PassiveInstance, slotIndex: number) {
    modal.confirm({
      title: 'Удалить модификатор?',
      content: removeModConfirmText(passive.global_level, slotIndex),
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: () => onRemoveMod('passive', passive.id, slotIndex),
    })
  }

  function handleDragStart(event: DragStartEvent) {
    if (locked) return
    const parsed = parseDragId(String(event.active.id))
    if (parsed?.kind === 'card') setActiveCardId(parsed.value)
    if (parsed?.kind === 'passive') setActivePassiveId(parsed.value)
  }

  function tryEquipPassive(slotIndex: 0 | 1 | 2 | 3 | 4, passiveId: string) {
    if (!hero) return
    const check = canEquipPassive(hero.passives, hero.passiveEquip, passiveId, slotIndex)
    if (!check.ok) {
      if (check.reason === 'stat_stack_conflict') {
        message.warning('Нельзя надеть: такой бонус к стату уже активен')
      }
      setDragRejectSlot(slotIndex)
      window.setTimeout(() => setDragRejectSlot(null), 600)
      return
    }
    onSetPassiveEquip(slotIndex, passiveId)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCardId(null)
    setActivePassiveId(null)
    if (locked) return
    const active = parseDragId(String(event.active.id))
    const over = event.over ? parseDragId(String(event.over.id)) : null
    if (!active) return

    if (active.kind === 'passive') {
      if (over?.kind === 'passive-equip') {
        const slotIndex = Number(over.value)
        if (slotIndex >= 0 && slotIndex < maxPassiveEquipSlots(hero!)) {
          tryEquipPassive(slotIndex as 0 | 1 | 2 | 3 | 4, active.value)
        }
        return
      }
      const fromEquipSlot = passiveEquip.indexOf(active.value)
      if (fromEquipSlot >= 0 && over?.kind !== 'passive-equip') {
        onSetPassiveEquip(fromEquipSlot as 0 | 1 | 2 | 3 | 4, null)
      }
      return
    }

    if (active.kind !== 'card') return

    if (over?.kind === 'loadout') {
      const card = resolveCard(active.value)
      const tmpl = card ? getCardAttackTemplate(card.templateId) : undefined
      if (tmpl?.enabled === false) return
      const slotIndex = Number(over.value)
      if (slotIndex >= 0 && slotIndex < maxSkillLoadoutSlots(hero!)) {
        onSetBattleLoadout(slotIndex as 0 | 1 | 2 | 3, active.value)
      }
      return
    }

    const fromLoadoutSlot = loadout.indexOf(active.value)
    if (fromLoadoutSlot >= 0 && over?.kind !== 'loadout') {
      onSetBattleLoadout(fromLoadoutSlot as 0 | 1 | 2 | 3, null)
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

  const skillSellPrice = sellPriceForSkill()

  function sellPropsForCard(card: CardInstance) {
    if (!onSellCard || card.templateId === 'strike') return {}
    return {
      onSell: () => onSellCard(card.id),
      sellPrice: skillSellPrice,
    }
  }

  function renderLoadoutSlot(slotIndex: 0 | 1 | 2 | 3) {
    const cardId = loadout[slotIndex]
    const card = cardId !== null ? resolveCard(cardId) : null
    return (
      <LoadoutSlotCell
        key={slotIndex}
        slotIndex={slotIndex}
        card={card ?? null}
        character={hero!}
        campaign={campaign}
        inBattle={locked}
        modsDisabled={modsDisabled}
        modsDisabledTooltip={modsDisabledTooltip}
        onOpenPicker={openCardPicker}
        onConfirmRemove={confirmRemoveCardMod}
      />
    )
  }

  if (!hero) return null

  const skillSlotCount = maxSkillLoadoutSlots(hero)
  const passiveEquipSlotCount = maxPassiveEquipSlots(hero)
  const skillSlotIndices = Array.from(
    { length: skillSlotCount },
    (_, i) => i as 0 | 1 | 2 | 3,
  )
  const passiveEquipSlotIndices = Array.from(
    { length: passiveEquipSlotCount },
    (_, i) => i as 0 | 1 | 2 | 3 | 4,
  )

  const content = (
    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        В бой ({skillSlotCount} {skillSlotCount === 1 ? 'слот' : skillSlotCount < 5 ? 'слота' : 'слотов'}) — перетащите карту из коллекции
      </Typography.Text>
      <div className="inventory-loadout-row" style={{ display: 'flex', gap: 4 }}>
        {skillSlotIndices.map(renderLoadoutSlot)}
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
                character={hero!}
                campaign={campaign}
                inBattle={locked}
                modsDisabled={modsDisabled}
                modsDisabledTooltip={modsDisabledTooltip}
                onOpenPicker={openCardPicker}
                onConfirmRemove={confirmRemoveCardMod}
                {...sellPropsForCard(card)}
              />
            )
          }}
        />
      </SortableContext>
      <Divider style={{ margin: '8px 0 4px' }} />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Навыки в бою ({passiveEquipSlotCount}{' '}
        {passiveEquipSlotCount === 1 ? 'слот' : passiveEquipSlotCount < 5 ? 'слота' : 'слотов'}) —
        перетащите из коллекции
      </Typography.Text>
      <div className="inventory-passive-equip-row" style={{ display: 'flex', gap: 4 }}>
        {passiveEquipSlotIndices.map((slotIndex) => {
          const passiveId = passiveEquip[slotIndex]
          const passive = passiveId !== null ? resolvePassive(passiveId) : null
          return (
            <PassiveEquipSlotCell
              key={slotIndex}
              slotIndex={slotIndex}
              passive={passive ?? null}
              character={hero!}
              campaign={campaign}
              locked={locked}
              modsDisabled={modsDisabled}
              modsDisabledTooltip={modsDisabledTooltip}
              onOpenPicker={openPassivePicker}
              onConfirmRemove={confirmRemovePassiveMod}
              dragReject={dragRejectSlot === slotIndex}
            />
          )
        })}
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Коллекция навыков
      </Typography.Text>
      <InventoryGrid
        itemCount={collectionPassives.length}
        renderCell={(index, isEmpty) => {
          if (isEmpty) {
            return <InventoryCell state="empty" ariaLabel="Пустой слот навыков" />
          }
          const passive = collectionPassives[index]!
          return (
            <DraggablePassiveCell
              key={passive.id}
              passive={passive}
              character={hero!}
              campaign={campaign}
              locked={locked}
              modsDisabled={modsDisabled}
              modsDisabledTooltip={modsDisabledTooltip}
              onOpenPicker={openPassivePicker}
              onConfirmRemove={confirmRemovePassiveMod}
            />
          )
        }}
      />
      <ModOfferPicker
        open={picker !== null}
        offer={picker?.offer ?? null}
        onCancel={() => setPicker(null)}
        onPick={(modTemplateId) => {
          if (!picker) return
          onPickModOffer(picker.carrierKind, picker.carrierId, picker.slotIndex, modTemplateId)
          setPicker(null)
        }}
      />
    </Space>
  )

  const lockTooltip = inBattle
    ? 'Доступно после боя'
    : inventoryLocked
      ? 'Недоступно во время экспедиции'
      : undefined

  if (locked && lockTooltip) {
    return <Tooltip title={lockTooltip}>{content}</Tooltip>
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
        ) : activePassiveId ? (
          <InventoryCell
            emoji={resolvePassiveEmoji(
              getPassiveTemplate(resolvePassive(activePassiveId)?.templateId ?? ''),
            )}
            state="filled"
            ariaLabel="Перетаскивание навыка"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
